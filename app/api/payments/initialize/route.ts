import { NextRequest, NextResponse } from "next/server";
import { initializeTransaction } from "@/services/payment-provider";
import { TransactionData } from "@/types";
import { assertCauseAcceptingDonations } from "@/lib/causes/proof-milestones";
import {
  assertWishlistAcceptingGifts,
  WishlistOwnerSnapshot,
} from "@/lib/wishlist/giving";
import { calculateProviderFee, calculateServiceFee } from "@/lib/utils";

const MIN_DONATION_AMOUNT = 100;

export async function POST(request: NextRequest) {
  try {
    const data: TransactionData = await request.json();

    // Cause donations carry causeId; wishlist gifts carry wishlistItemId.
    // A payload with both is malformed and must not pick a ledger by luck.
    if (
      !data.amount ||
      !data.email ||
      (!data.causeId && !data.wishlistItemId)
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (data.causeId && data.wishlistItemId) {
      return NextResponse.json(
        { error: "Ambiguous payment target" },
        { status: 400 },
      );
    }

    if (Number(data.amount) < MIN_DONATION_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum donation amount is ₦${MIN_DONATION_AMOUNT}` },
        { status: 400 },
      );
    }

    // Wishlist gifts re-check their guards server-side and resolve the
    // owner's payout destination here — the giver never sends a subaccount
    // (unlike causes, where the donate form carries it). Without verified
    // payout details the charge still succeeds and lands on the platform
    // account; the owner sees the gold callout on their own page.
    let wishlistOwner: WishlistOwnerSnapshot | null = null;
    if (data.wishlistItemId) {
      try {
        const snapshot = await assertWishlistAcceptingGifts(
          data.wishlistItemId,
          Number(data.amount),
        );
        wishlistOwner = snapshot.owner;

        if (data.paymentProvider === "flutterwave") {
          if (snapshot.owner.flutterwaveSubAccountId) {
            data.subaccounts = [
              {
                subaccount: snapshot.owner.flutterwaveSubAccountId,
                share: Number(data.amount) * 100,
              },
            ];
          }
        } else if (snapshot.owner.subAccountCode) {
          data.subaccounts = [
            {
              subaccount: snapshot.owner.subAccountCode,
              share: Number(data.amount) * 100,
            },
          ];
        }
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 403 });
      }
    } else {
      try {
        await assertCauseAcceptingDonations(data.causeId as string);
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 403 });
      }
    }

    // Extract referral code from payload or ref_v1 cookie
    const cookieRef = request.cookies?.get("ref_v1")?.value;
    if (!data.referrer_code && cookieRef) {
      data.referrer_code = cookieRef;
    }

    // Force recalculate fees on the server to prevent spoofing
    // and correctly apply Flutterwave vs Paystack logic
    data.serviceFee = calculateServiceFee(Number(data.amount));
    data.providerFee = calculateProviderFee(
      Number(data.amount),
      data.paymentProvider as "paystack" | "flutterwave",
    );

    // JIT Flutterwave Subaccount Creation for existing users
    if (
      data.paymentProvider === "flutterwave" &&
      (!data.subaccounts || data.subaccounts.length === 0)
    ) {
      try {
        const { prisma } = await import("@/lib/prisma");
        const Flutterwave = (await import("@/services/flutterwave")).default;

        // Wishlist gifts resolved their owner in the guard above; causes
        // still look theirs up here.
        const ownerUser = wishlistOwner
          ? wishlistOwner
          : await (async () => {
              const cause = await prisma.cause.findUnique({
                where: { id: data.causeId },
                select: { userId: true },
              });
              if (!cause?.userId) return null;
              return prisma.user.findUnique({
                where: { id: cause.userId },
                select: {
                  id: true,
                  accountNumber: true,
                  bankName: true,
                  fullName: true,
                  username: true,
                  email: true,
                  subAccountCode: true,
                  flutterwaveSubAccountId: true,
                },
              });
            })();

        // Only if they don't have flutterwave but HAVE paystack (meaning they are verified)
        if (
          ownerUser &&
          !ownerUser.flutterwaveSubAccountId &&
          ownerUser.subAccountCode &&
          ownerUser.accountNumber &&
          ownerUser.bankName
        ) {
          const bankCode = await Flutterwave.getBankCode(ownerUser.bankName);
          if (bankCode) {
            const isTestMode =
              process.env.FLUTTERWAVE_SECRET_KEY?.includes("TEST");

            let subaccountId: string | null = null;

            try {
              const newSubaccount = await Flutterwave.createSubaccount({
                account_number: isTestMode
                  ? "0690000031"
                  : ownerUser.accountNumber,
                bank_code: isTestMode ? "044" : bankCode,
                business_name:
                  ownerUser.fullName || ownerUser.username || "RefreeG Creator",
                business_email: ownerUser.email || "no-reply@refreeg.com",
              });
              subaccountId = newSubaccount?.subaccount_id || null;
            } catch (createErr: any) {
              const msg =
                createErr.response?.data?.message || createErr.message || "";
              if (
                msg.toLowerCase().includes("already exists") &&
                ownerUser.accountNumber
              ) {
                // Recover the existing Flutterwave subaccount ID
                subaccountId = await Flutterwave.findSubaccountByAccountNumber(
                  ownerUser.accountNumber,
                );
              }
            }

            if (subaccountId) {
              await prisma.user.update({
                where: { id: ownerUser.id },
                data: { flutterwaveSubAccountId: subaccountId },
              });

              data.subaccounts = [
                {
                  subaccount: subaccountId,
                  share: Number(data.amount) * 100,
                },
              ];
            }
          }
        }
      } catch (jitError) {
        console.error("JIT Flutterwave Subaccount Creation Failed:", jitError);
      }
    }

    // Ensure Flutterwave gets its specific subaccount ID, not the Paystack one
    if (
      data.paymentProvider === "flutterwave" &&
      data._flutterwaveSubAccountId
    ) {
      data.subaccounts = [
        {
          subaccount: data._flutterwaveSubAccountId,
          share: Number(data.amount) * 100,
        },
      ];
    }

    const response = await initializeTransaction(data, data.paymentProvider);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error("Payment initialization error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to initialize payment",
        success: false,
      },
      { status: 500 },
    );
  }
}
