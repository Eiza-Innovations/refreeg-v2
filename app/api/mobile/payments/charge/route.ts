import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/uuid";
import Paystack from "@/services/paystack";
import { calculateServiceFee, calculateProviderFee } from "@/lib/utils";
import {
  decodeStoreReviewDemoReference,
  encodeStoreReviewDemoReference,
  isStoreReviewDemoAccount,
} from "@/lib/auth/store-review-demo";

const MAX_DONATION_AMOUNT = 10_000_000;
const SUPPORTED_CHARGE_CHANNELS = new Set([
  "bank_transfer",
  "ussd",
  "card",
  "opay",
]);

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_payments_charge",
      limit: 30,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const data = await request.json();

    // Validate Bearer token whenever Authorization is supplied
    let authUser:
      { id: string; email: string; fullName: string | null } | undefined;
    if (request.headers.get("authorization")) {
      const authResult = await authenticateMobileRequest(request);
      if (authResult.errorResponse) return authResult.errorResponse;
      authUser = authResult.user;
    }

    // 1. Handle PIN / OTP / Phone submissions for ongoing charge
    if (data.action === "submit_pin") {
      if (!data.pin || !data.reference) {
        return apiError("Missing PIN or payment reference", 400);
      }
      const trimmedRef = String(data.reference).trim();
      if (
        isStoreReviewDemoAccount(authUser?.email) &&
        decodeStoreReviewDemoReference(trimmedRef)
      ) {
        return apiSuccess({
          status: "success",
          reference: trimmedRef,
          isStoreReviewDemo: true,
        });
      }
      try {
        const res = await Paystack.submitPin(data.pin, trimmedRef);
        return apiSuccess(res);
      } catch (e: any) {
        return apiError(e.message || "Failed to submit PIN", 400);
      }
    }

    if (data.action === "submit_otp") {
      if (!data.otp || !data.reference) {
        return apiError("Missing OTP or payment reference", 400);
      }
      const trimmedRef = String(data.reference).trim();
      if (
        isStoreReviewDemoAccount(authUser?.email) &&
        decodeStoreReviewDemoReference(trimmedRef)
      ) {
        return apiSuccess({
          status: "success",
          reference: trimmedRef,
          isStoreReviewDemo: true,
        });
      }
      try {
        const res = await Paystack.submitOtp(data.otp, trimmedRef);
        return apiSuccess(res);
      } catch (e: any) {
        return apiError(e.message || "Failed to submit OTP", 400);
      }
    }

    if (data.action === "submit_phone") {
      if (!data.phone || !data.reference) {
        return apiError("Missing phone or payment reference", 400);
      }
      const trimmedRef = String(data.reference).trim();
      if (
        isStoreReviewDemoAccount(authUser?.email) &&
        decodeStoreReviewDemoReference(trimmedRef)
      ) {
        return apiSuccess({
          status: "success",
          reference: trimmedRef,
          isStoreReviewDemo: true,
        });
      }
      try {
        const res = await Paystack.submitPhone(data.phone, trimmedRef);
        return apiSuccess(res);
      } catch (e: any) {
        return apiError(e.message || "Failed to submit phone", 400);
      }
    }

    // 2. Initiate fresh direct charge (Bank Transfer, USSD, Card, OPay, or ₦50 Card Setup)
    if (!data.amount || !data.email || !data.causeId) {
      return apiError("Missing required fields (amount, email, causeId)", 400);
    }

    const isCardSetup = data.causeId === "card_setup";
    if (isCardSetup && !authUser) {
      return apiError("Authentication is required for card setup", 401);
    }

    const numAmount = Number(data.amount);
    const minAllowedAmount = isCardSetup ? 50 : 100;
    if (!Number.isFinite(numAmount) || numAmount < minAllowedAmount) {
      return apiError(`Minimum amount is ₦${minAllowedAmount}`, 400);
    }
    if (isCardSetup && numAmount !== 50) {
      return apiError(
        "Card setup verification charge must be exactly ₦50",
        400,
      );
    }
    if (!isCardSetup && numAmount > MAX_DONATION_AMOUNT) {
      return apiError(
        `Maximum donation amount is ₦${MAX_DONATION_AMOUNT.toLocaleString()}`,
        400,
      );
    }

    if (!isCardSetup) {
      if (!isUuid(data.causeId)) {
        return apiError("Invalid causeId format", 400);
      }
      const cause = await prisma.cause.findUnique({
        where: { id: data.causeId },
        select: { status: true, paused: true, compliance_paused: true },
      });
      if (!cause) {
        return apiError("Cause not found", 404);
      }
      if (cause.compliance_paused) {
        return apiError(
          "This campaign is not currently accepting donations. The organizer needs to post a fund-use update.",
          403,
        );
      }
      if (cause.status !== "approved" || cause.paused) {
        return apiError("This cause is not accepting donations currently", 403);
      }
    }

    const serviceFee = isCardSetup ? 0 : calculateServiceFee(numAmount);
    const providerFee = isCardSetup
      ? 0
      : calculateProviderFee(numAmount, "paystack");
    const tipAmount = isCardSetup ? 0 : Number(data.tipAmount ?? 0);
    if (!Number.isFinite(tipAmount) || tipAmount < 0) {
      return apiError("Invalid tip amount", 400);
    }
    const totalAmount = numAmount + serviceFee + providerFee + tipAmount;
    const totalKobo = Math.round(totalAmount * 100);
    const channel = data.channel || "bank_transfer";
    if (!SUPPORTED_CHARGE_CHANNELS.has(channel)) {
      return apiError("Unsupported payment channel", 400);
    }

    const normalizedEmail = String(data.email).trim().toLowerCase();

    const effectiveDonorName = data.isAnonymous
      ? "Anonymous"
      : data.donorName || authUser?.fullName || "Supporter";

    if (isStoreReviewDemoAccount(authUser?.email)) {
      const demoRef = encodeStoreReviewDemoReference({
        causeId: data.causeId,
        amount: numAmount,
        tipAmount,
        donorName: effectiveDonorName,
        message: data.message || "",
        isAnonymous: Boolean(data.isAnonymous),
      });

      if (isCardSetup || channel === "card") {
        return apiSuccess({
          status: "success",
          reference: demoRef,
          display_text: isCardSetup
            ? "Demo verification card authorized."
            : "Demo card charge completed.",
          totalAmount,
          isStoreReviewDemo: true,
        });
      }

      if (channel === "bank_transfer") {
        return apiSuccess({
          status: "send_address",
          reference: demoRef,
          display_text: `Please transfer ₦${totalAmount.toLocaleString()} to the demo account below.`,
          account_number: "9912345678",
          account_name: "RefreeG / Store Review Demo",
          bank_name: "Wema Bank",
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          totalAmount,
          isStoreReviewDemo: true,
        });
      }

      if (channel === "ussd") {
        const bankCode = data.ussdBank || "737";
        return apiSuccess({
          status: "send_ussd",
          reference: demoRef,
          display_text: `Dial *${bankCode}*000*1234# on your phone`,
          ussd_code: `*${bankCode}*000*1234#`,
          totalAmount,
          isStoreReviewDemo: true,
        });
      }

      if (channel === "opay") {
        return apiSuccess({
          status: "pay_offline",
          reference: demoRef,
          display_text:
            "Please authorize the payment prompt sent to your OPay app.",
          totalAmount,
          isStoreReviewDemo: true,
        });
      }

      return apiError("Unsupported payment channel", 400);
    }

    const metadata = {
      amount: numAmount,
      tip_amount: tipAmount,
      customer_name: effectiveDonorName,
      cause_id: data.causeId,
      email: normalizedEmail,
      message: data.message || "",
      is_anonymous: Boolean(data.isAnonymous),
      channel,
      ...(authUser ? { user_id: authUser.id } : {}),
      ...(isCardSetup ? { purpose: "card_setup" } : {}),
    };

    const chargePayload: Record<string, any> = {
      email: normalizedEmail,
      amount: totalKobo,
      metadata,
    };

    if (channel === "bank_transfer") {
      chargePayload.bank_transfer = {};
    } else if (channel === "ussd") {
      chargePayload.ussd = {
        type: data.ussdBank || "737",
      };
    } else if (channel === "card") {
      if (
        typeof data.card?.number !== "string" ||
        typeof data.card?.cvv !== "string" ||
        typeof data.card?.expiry_month !== "string" ||
        typeof data.card?.expiry_year !== "string" ||
        !data.card.number.trim() ||
        !data.card.cvv.trim() ||
        !data.card.expiry_month.trim() ||
        !data.card.expiry_year.trim()
      ) {
        return apiError(
          "Missing or invalid card details (number, cvv, expiry)",
          400,
        );
      }
      chargePayload.card = {
        number: data.card.number.replace(/\s+/g, ""),
        cvv: data.card.cvv.trim(),
        expiry_month: data.card.expiry_month.trim(),
        expiry_year: data.card.expiry_year.trim(),
      };
      if (typeof data.pin === "string" && data.pin.trim()) {
        chargePayload.pin = data.pin.trim();
      }
    } else if (channel === "opay") {
      chargePayload.mobile_money = {
        phone: data.phone || data.mobilePhone,
        provider: "opay",
      };
    }

    try {
      const chargeResponse = await Paystack.charge(chargePayload);
      return apiSuccess({
        status: chargeResponse.status,
        reference: chargeResponse.reference,
        display_text: chargeResponse.display_text,
        account_number: chargeResponse.account_number,
        account_name: chargeResponse.account_name,
        bank_name:
          chargeResponse.bank?.name || chargeResponse.bank || "Wema Bank",
        ussd_code: chargeResponse.ussd_code,
        expires_at: chargeResponse.expires_at,
        url: chargeResponse.url,
        totalAmount,
      });
    } catch (chargeErr: any) {
      console.warn("Paystack live charge call error:", chargeErr.message);

      // Only allow non-production local development fallback when NODE_ENV !== "production"
      if (process.env.NODE_ENV !== "production") {
        const mockRef = `ref_rg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        if (channel === "bank_transfer") {
          return apiSuccess({
            status: "send_address",
            reference: mockRef,
            display_text: `Please transfer ₦${totalAmount.toLocaleString()} to the dedicated account below.`,
            account_number:
              "99" + Math.floor(10000000 + Math.random() * 90000000),
            account_name: "RefreeG / Paystack Checkout",
            bank_name: "Wema Bank",
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            totalAmount,
            isMock: true,
          });
        }

        if (channel === "ussd") {
          const bankCode = data.ussdBank || "737";
          return apiSuccess({
            status: "send_ussd",
            reference: mockRef,
            display_text: `Dial *${bankCode}*000*${Math.floor(1000 + Math.random() * 9000)}# on your phone`,
            ussd_code: `*${bankCode}*000*${Math.floor(1000 + Math.random() * 9000)}#`,
            totalAmount,
            isMock: true,
          });
        }

        if (channel === "opay") {
          return apiSuccess({
            status: "pay_offline",
            reference: mockRef,
            display_text:
              "Please authorize the payment prompt sent to your OPay app.",
            totalAmount,
            isMock: true,
          });
        }

        if (channel === "card") {
          return apiSuccess({
            status: "send_otp",
            reference: mockRef,
            display_text: "An OTP was sent to your registered phone number.",
            totalAmount,
            isMock: true,
          });
        }
      }

      return apiError(chargeErr.message || "Failed to initiate payment", 400);
    }
  } catch (error: any) {
    console.error("Mobile API Charge Error:", error);
    return apiError("Internal server error", 500);
  }
}
