import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import Paystack from "@/services/paystack";
import { processSuccessfulCharge } from "@/lib/payments/paystack-charge-processing";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

async function handleVerification(reference: string | null) {
  if (!reference || typeof reference !== "string" || !reference.trim()) {
    return apiError("Missing payment reference", 400);
  }

  const trimmedReference = reference.trim();
  const isSuccessful = await Paystack.verifyTransaction(trimmedReference);

  if (!isSuccessful) {
    return apiSuccess({
      verified: false,
      message: "Transaction was not successful or could not be verified",
    });
  }

  // Process the charge to create/update the donation record, sync milestones, record rewards
  const processResult = await processSuccessfulCharge(trimmedReference);
  if (!processResult.ok) {
    return apiError(
      "Payment verification succeeded but donation could not be recorded",
      422,
    );
  }

  // Retrieve the full donation details for the mobile receipt (never expose donor email publicly)
  const donation = await prisma.donation.findFirst({
    where: { paystack_reference: trimmedReference },
    include: {
      cause: {
        select: {
          id: true,
          title: true,
          raised: true,
          goal: true,
          category: true,
        },
      },
    },
  });

  return apiSuccess({
    verified: true,
    reference: trimmedReference,
    donation: donation
      ? {
          id: donation.id,
          amount: Number(donation.amount),
          tipAmount: Number(donation.tip_amount || 0),
          donorName: donation.is_anonymous ? "Anonymous" : donation.name,
          message: donation.message,
          isAnonymous: donation.is_anonymous,
          createdAt: donation.createdAt,
          causeId: donation.causeId,
          causeTitle: donation.cause?.title,
          causeRaised: Number(donation.cause?.raised || 0),
          causeGoal: Number(donation.cause?.goal || 0),
        }
      : null,
  });
}

export async function GET(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_payments_verify",
      limit: 20,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");
    return await handleVerification(reference);
  } catch (error: any) {
    console.error("Mobile API Payment Verification Error (GET):", error);
    return apiError(error.message || "Failed to verify payment", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_payments_verify",
      limit: 20,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const reference = body?.reference;
    return await handleVerification(reference);
  } catch (error: any) {
    console.error("Mobile API Payment Verification Error (POST):", error);
    return apiError(error.message || "Failed to verify payment", 500);
  }
}
