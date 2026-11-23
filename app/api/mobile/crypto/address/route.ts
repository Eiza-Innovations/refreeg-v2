import crypto from "crypto";
import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/uuid";
import {
  fetchBreetBanks,
  fetchBreetDepositAssets,
  findBreetWalletByLabel,
  generateBreetWalletAddress,
  getBreetHeaders,
  resolveBreetBankId,
  resolveBreetDepositAssetId,
  updateBreetWalletBank,
} from "@/lib/payments/breet";

export async function OPTIONS() {
  return handleCorsPreflight();
}

const FALLBACK_ASSET_ID = "USDT_SOL";
const NARRATION = "Refreeg Solana Checkout";

/**
 * POST /api/mobile/crypto/address
 * Resolves/generates a Breet deposit address and QR code for USDT on Solana donations,
 * and records the pending donation in the database once a valid address is returned.
 */
export async function POST(request: NextRequest) {
  try {
    let authUser:
      { id: string; email: string; fullName: string | null } | undefined;
    if (request.headers.get("authorization")) {
      const authResult = await authenticateMobileRequest(request);
      if (authResult.errorResponse) return authResult.errorResponse;
      authUser = authResult.user;
    }

    const verifiedDonorId = authUser?.id || "mobile_guest";
    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_crypto_address",
      limit: 10,
      windowMs: 60_000,
      ...(authUser ? { identifier: verifiedDonorId } : {}),
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const {
      causeId,
      donorName,
      donorEmail,
      message,
      isAnonymous,
      amountCrypto,
    } = body;

    if (!causeId) {
      return apiError("Missing causeId parameter", 400);
    }

    if (!isUuid(causeId)) {
      return apiError("Invalid causeId format", 400);
    }

    let approxNaira = 0;
    if (
      amountCrypto !== undefined &&
      amountCrypto !== null &&
      amountCrypto !== ""
    ) {
      const parsedCrypto = Number(amountCrypto);
      if (!Number.isFinite(parsedCrypto) || parsedCrypto <= 0) {
        return apiError("Invalid crypto amount", 400);
      }
      approxNaira = parsedCrypto * 1500;
    }

    const cause = await prisma.cause.findUnique({
      where: { id: causeId },
      include: {
        user: {
          select: {
            id: true,
            accountNumber: true,
            bankName: true,
          },
        },
      },
    });

    if (!cause || !cause.user) {
      return apiError("Target campaign records not found", 404);
    }

    if (
      cause.status !== "approved" ||
      cause.paused ||
      cause.compliance_paused
    ) {
      return apiError("This cause is not accepting donations currently", 403);
    }

    const bankAccountNumber = cause.user.accountNumber;
    const bankName = cause.user.bankName;
    if (!bankAccountNumber || !bankName) {
      return apiError(
        "This campaign creator has not configured their bank profile settlement details yet.",
        422,
      );
    }

    const headers = getBreetHeaders();
    if (!headers) {
      console.error("❌ Breet API credentials are not configured");
      return apiError("Crypto checkout is not configured", 503);
    }

    const banks = await fetchBreetBanks().catch((err: any) => {
      console.error("💥 Could not load Breet bank list:", err?.message);
      return [];
    });
    const bankId = resolveBreetBankId(bankName, banks);
    if (!bankId) {
      console.error(
        `💥 No Breet bank match for "${bankName}" (creator ${cause.user.id})`,
      );
      return apiError(
        "This campaign's settlement bank is not supported yet. Please ask the organizer to update their bank details.",
        422,
      );
    }

    let assetId = process.env.BREET_ASSET_ID || null;
    if (!assetId) {
      const assets = await fetchBreetDepositAssets().catch((err: any) => {
        console.error("💥 Could not load Breet deposit assets:", err?.message);
        return [];
      });
      assetId = resolveBreetDepositAssetId(assets, "USDT", "Solana");
      if (!assetId) {
        assetId = FALLBACK_ASSET_ID;
      }
    }

    const compoundLabel = `${verifiedDonorId}_${causeId}`;
    let walletAddress: string | null = null;

    try {
      const wallet = await generateBreetWalletAddress({
        assetId,
        label: compoundLabel,
        bankId,
        accountNumber: bankAccountNumber,
        narration: NARRATION,
      });
      walletAddress = wallet.address;
    } catch (genError: any) {
      if (genError?.breetStatus === 400) {
        const existing = await findBreetWalletByLabel(compoundLabel).catch(
          () => null,
        );
        if (existing?.address) {
          try {
            await updateBreetWalletBank(existing.id, bankId, bankAccountNumber);
          } catch (bankErr: any) {
            console.warn(
              "⚠️ Could not refresh linked bank on existing wallet:",
              bankErr?.message,
            );
          }
          walletAddress = existing.address;
        }
      }

      if (!walletAddress) {
        console.error("💥 Breet address generation failed:", genError?.message);
        return apiError(
          "Crypto checkout could not be prepared. Please try again shortly.",
          502,
        );
      }
    }

    const emailToUse =
      (typeof donorEmail === "string" ? donorEmail.trim() : "") ||
      authUser?.email ||
      "crypto-donor@refreeg.com";
    const nameToUse = isAnonymous
      ? "Anonymous"
      : (typeof donorName === "string" ? donorName.trim() : "") ||
        authUser?.fullName ||
        "Anonymous Supporter";
    const cryptoRef = `breet_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    let pendingDonation = null;
    try {
      pendingDonation = await prisma.donation.create({
        data: {
          causeId,
          ...(authUser ? { userId: authUser.id } : {}),
          amount: approxNaira,
          name: nameToUse,
          email: emailToUse,
          message: typeof message === "string" ? message.trim() || null : null,
          is_anonymous: Boolean(isAnonymous),
          status: "pending",
          payment_provider: "breet",
          paystack_reference: cryptoRef,
        },
      });
    } catch (dbErr) {
      console.warn("Could not pre-record crypto donation record:", dbErr);
    }

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(walletAddress)}`;

    return apiSuccess({
      asset: "USDT",
      network: "Solana (SPL)",
      address: walletAddress,
      qrCodeUrl,
      campaignTitle: cause.title,
      reference: pendingDonation?.paystack_reference || cryptoRef,
      donationId: pendingDonation?.id,
    });
  } catch (error: any) {
    console.error("Mobile Crypto Address Error:", error);
    return apiError("Failed to generate crypto address", 500);
  }
}
