import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import Paystack from "@/services/paystack";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/uuid";
import { calculateServiceFee, calculateProviderFee } from "@/lib/utils";
import {
  encodeStoreReviewDemoReference,
  isStoreReviewDemoAccount,
} from "@/lib/auth/store-review-demo";

const MIN_DONATION_AMOUNT = 100;
const MAX_DONATION_AMOUNT = 10_000_000;

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_payments_initialize",
      limit: 20,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    let authUser:
      { id: string; email: string; fullName: string | null } | undefined;
    if (request.headers.get("authorization")) {
      const authResult = await authenticateMobileRequest(request);
      if (authResult.errorResponse) return authResult.errorResponse;
      authUser = authResult.user;
    }

    const data = await request.json();

    if (!data.amount || !data.email || !data.causeId) {
      return apiError("Missing required fields (amount, email, causeId)", 400);
    }

    if (!isUuid(data.causeId)) {
      return apiError("Invalid causeId format", 400);
    }

    const numAmount = Number(data.amount);
    if (!Number.isFinite(numAmount) || numAmount < MIN_DONATION_AMOUNT) {
      return apiError(
        `Minimum donation amount is ₦${MIN_DONATION_AMOUNT}`,
        400,
      );
    }

    if (numAmount > MAX_DONATION_AMOUNT) {
      return apiError(
        `Maximum donation amount is ₦${MAX_DONATION_AMOUNT.toLocaleString()}`,
        400,
      );
    }

    const rawTip = data.tipAmount ?? data.tip_amount ?? 0;
    const tipAmount = Number(rawTip);
    if (!Number.isFinite(tipAmount) || tipAmount < 0) {
      return apiError("Invalid tip amount", 400);
    }

    const cause = await prisma.cause.findUnique({
      where: { id: data.causeId },
      select: {
        status: true,
        paused: true,
        compliance_paused: true,
        user: {
          select: { subAccountCode: true },
        },
      },
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

    // Set callback URL for mobile deep link if not provided
    const rawCallbackUrl =
      typeof data.callback_url === "string" && data.callback_url.trim()
        ? data.callback_url.trim()
        : "refreeg://payment/verify";
    let parsedCallbackUrl: URL;
    try {
      parsedCallbackUrl = new URL(rawCallbackUrl);
    } catch {
      return apiError("Invalid callback_url format", 400);
    }
    const allowedProtocols =
      process.env.NODE_ENV === "production"
        ? new Set(["refreeg:", "https:"])
        : new Set(["refreeg:", "https:", "http:"]);
    if (!allowedProtocols.has(parsedCallbackUrl.protocol)) {
      return apiError("Unsupported callback_url protocol", 400);
    }
    const callbackUrl = parsedCallbackUrl.toString();
    const normalizedEmail = String(data.email).trim().toLowerCase();

    // Recalculate fees on the server to prevent spoofing
    const serviceFee = calculateServiceFee(numAmount);
    const providerFee = calculateProviderFee(numAmount, "paystack");

    const effectiveDonorName = data.isAnonymous
      ? "Anonymous"
      : data.donorName ||
        data.name ||
        data.full_name ||
        authUser?.fullName ||
        "Supporter";

    if (isStoreReviewDemoAccount(authUser?.email)) {
      const demoReference = encodeStoreReviewDemoReference({
        causeId: data.causeId,
        amount: numAmount,
        tipAmount,
        donorName: effectiveDonorName,
        message: data.message || "",
        isAnonymous: Boolean(data.isAnonymous),
      });

      const demoRedirectUrl = new URL(callbackUrl);
      demoRedirectUrl.searchParams.set("reference", demoReference);

      return apiSuccess({
        authorization_url: demoRedirectUrl.toString(),
        access_code: "store_review_demo_code",
        reference: demoReference,
        isStoreReviewDemo: true,
        breakdown: {
          amount: numAmount,
          serviceFee,
          providerFee,
          tipAmount,
          total: numAmount + serviceFee + providerFee + tipAmount,
        },
      });
    }

    const subaccounts = cause.user?.subAccountCode
      ? [{ subaccount: cause.user.subAccountCode, share: numAmount * 100 }]
      : undefined;

    let channels: string[] | undefined = undefined;
    if (data.channel === "card") {
      channels = ["card"];
    } else if (data.channel === "bank_transfer") {
      channels = ["bank_transfer"];
    } else if (data.channel === "ussd") {
      channels = ["ussd"];
    } else if (data.channel === "opay") {
      // Paystack has no standalone "opay" channel: OPay is a sub-option of the
      // "bank" channel. "mobile_money" is intentionally excluded because it adds
      // unrelated options (e.g. Zap) to the hosted checkout page.
      channels = ["bank"];
    }

    const response = await Paystack.initializeTransaction({
      amount: numAmount,
      email: normalizedEmail,
      causeId: data.causeId,
      full_name: effectiveDonorName,
      serviceFee,
      providerFee,
      tipAmount,
      callbackUrl,
      subaccounts,
      message: data.message || "",
      isAnonymous: Boolean(data.isAnonymous),
      id: authUser?.id,
      referrer_code: data.referrer_code,
      channels,
    });

    return apiSuccess({
      ...response,
      breakdown: {
        amount: numAmount,
        serviceFee,
        providerFee,
        tipAmount,
        total: numAmount + serviceFee + providerFee + tipAmount,
      },
    });
  } catch (error: any) {
    console.error("Mobile API Payment Initialization Error:", error);
    return apiError(error.message || "Failed to initialize payment", 500);
  }
}
