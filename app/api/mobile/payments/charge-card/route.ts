import crypto from "crypto";
import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/uuid";
import Paystack from "@/services/paystack";
import { calculateServiceFee, calculateProviderFee } from "@/lib/utils";
import { processSuccessfulCharge } from "@/lib/payments/paystack-charge-processing";

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * POST /api/mobile/payments/charge-card
 * Authorizes a recurring 1-click charge on a saved card via Paystack token.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateMobileRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const user = authResult.user!;

    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_payments_charge_card",
      limit: 10,
      windowMs: 60_000,
      identifier: user.id,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const {
      cardId,
      causeId,
      amount,
      tipAmount = 0,
      message,
      isAnonymous,
      donorName,
      idempotencyKey,
    } = body;

    if (!cardId || !causeId || amount === undefined || amount === null) {
      return apiError("Missing required fields: cardId, causeId, amount", 400);
    }

    if (!isUuid(cardId) || !isUuid(causeId)) {
      return apiError("Invalid cardId or causeId format", 400);
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount < 100) {
      return apiError("Minimum donation amount is ₦100", 400);
    }

    const tip = Number(tipAmount ?? 0);
    if (!Number.isFinite(tip) || tip < 0) {
      return apiError("Invalid tip amount", 400);
    }

    // Fetch cause details and verify it is approved and accepting donations
    const cause = await prisma.cause.findUnique({
      where: { id: causeId },
      select: {
        id: true,
        status: true,
        paused: true,
        compliance_paused: true,
        title: true,
        user: {
          select: {
            subAccountCode: true,
          },
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
      return apiError("This cause cannot accept donations currently", 403);
    }

    // Calculate exact fees
    const serviceFee = calculateServiceFee(numAmount);
    const providerFee = calculateProviderFee(numAmount, "paystack");
    const totalFees = serviceFee + providerFee + tip;

    const effectiveName = isAnonymous
      ? "Anonymous"
      : donorName?.trim() || user.fullName || "Supporter";

    // Fetch the saved card
    const card = await prisma.user_saved_cards.findFirst({
      where: {
        id: cardId,
        user_id: user.id,
      },
    });

    if (!card) {
      return apiError("Saved card not found", 404);
    }

    const rawIdempotencyKey =
      (typeof idempotencyKey === "string" && idempotencyKey.trim()) ||
      request.headers.get("idempotency-key")?.trim() ||
      "";

    const reference = rawIdempotencyKey
      ? `mc_${user.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}_${crypto
          .createHash("sha256")
          .update(
            `${user.id}:${causeId}:${cardId}:${numAmount}:${tip}:${rawIdempotencyKey}`,
          )
          .digest("hex")
          .slice(0, 20)}`
      : `mc_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    if (rawIdempotencyKey) {
      const existingDonation = await prisma.donation.findFirst({
        where: { paystack_reference: reference },
        include: {
          cause: {
            select: {
              id: true,
              title: true,
              raised: true,
              goal: true,
            },
          },
        },
      });

      if (existingDonation) {
        return apiSuccess({
          status: "success",
          reference,
          amount: numAmount,
          serviceFee,
          providerFee,
          tipAmount: tip,
          totalCharged: numAmount + totalFees,
          donation: {
            id: existingDonation.id,
            amount: Number(existingDonation.amount),
            donorName: existingDonation.is_anonymous
              ? "Anonymous"
              : existingDonation.name,
            causeTitle: existingDonation.cause?.title,
            reference: existingDonation.paystack_reference,
            createdAt: existingDonation.createdAt,
          },
        });
      }
    }

    const subaccount = cause.user?.subAccountCode || undefined;

    // Call Paystack chargeAuthorization with bearer: "account" so providerFee
    // is not double-deducted from the creator's subaccount.
    const chargeResult = await Paystack.chargeAuthorization({
      authorizationCode: card.authorization_code,
      email: card.email || user.email,
      amountNgn: numAmount,
      serviceFeeNgn: totalFees,
      reference,
      causeId,
      subaccount,
      bearer: "account",
      metadata: {
        cause_id: causeId,
        user_id: user.id,
        amount: numAmount,
        tip_amount: tip,
        customer_name: effectiveName,
        email: user.email,
        message: message || "",
        is_anonymous: Boolean(isAnonymous),
      },
    });

    if (chargeResult.status !== "success") {
      return apiError(
        chargeResult.gateway_response ||
          "Payment charge failed. Please try another card.",
        400,
      );
    }

    // Process the successful charge to record donation, update stats, notify donor
    const processResult = await processSuccessfulCharge(reference);
    if (!processResult.ok) {
      return apiError(
        `Payment succeeded but could not be recorded: ${processResult.reason}`,
        422,
      );
    }

    // Fetch created donation details
    const donation = await prisma.donation.findFirst({
      where: { paystack_reference: reference },
      include: {
        cause: {
          select: {
            id: true,
            title: true,
            raised: true,
            goal: true,
          },
        },
      },
    });

    return apiSuccess({
      status: "success",
      reference,
      amount: numAmount,
      serviceFee,
      providerFee,
      tipAmount: tip,
      totalCharged: numAmount + totalFees,
      donation: donation
        ? {
            id: donation.id,
            amount: Number(donation.amount),
            donorName: donation.is_anonymous ? "Anonymous" : donation.name,
            causeTitle: donation.cause?.title,
            reference: donation.paystack_reference,
            createdAt: donation.createdAt,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Error charging saved card:", error);
    return apiError(error.message || "Failed to process card payment", 500);
  }
}
