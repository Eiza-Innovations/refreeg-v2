import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { createPledge } from "@/actions/donations/pledge-actions";
import Paystack from "@/services/paystack";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/uuid";
import { PLEDGE_VERIFICATION_AMOUNT_NGN } from "@/lib/payments/pledge-constants";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_pledges_create",
      limit: 15,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();

    if (
      typeof body.causeId !== "string" ||
      !body.amount ||
      !body.reminderDate ||
      (!body.isAnonymous && !body.name) ||
      typeof body.email !== "string" ||
      !body.email.trim()
    ) {
      return apiError(
        "Missing required fields (causeId, amount, reminderDate, email, and name unless anonymous)",
        400,
      );
    }

    if (!isUuid(body.causeId)) {
      return apiError("Invalid causeId format", 400);
    }

    const numAmount = Number(body.amount);
    if (!Number.isFinite(numAmount) || numAmount < 100) {
      return apiError("Minimum pledge amount is ₦100", 400);
    }

    const cause = await prisma.cause.findUnique({
      where: { id: body.causeId },
      select: { status: true, paused: true, compliance_paused: true },
    });

    if (!cause) {
      return apiError("Cause not found", 404);
    }

    if (
      cause.status !== "approved" ||
      cause.paused ||
      cause.compliance_paused
    ) {
      return apiError("This cause is not accepting pledges currently", 403);
    }

    const effectiveName = body.isAnonymous
      ? "Anonymous Donor"
      : (typeof body.name === "string" ? body.name.trim() : "") ||
        "Anonymous Donor";

    const pledgeData = {
      causeId: body.causeId,
      amount: numAmount,
      reminderDate: body.reminderDate,
      name: effectiveName,
      email: body.email.trim().toLowerCase(),
      note: body.note,
      causeTitle: body.causeTitle,
    };

    const result = await createPledge(pledgeData);

    if (result.error || !result.data) {
      return apiError(result.error || "Failed to create pledge", 400);
    }

    // If donor chose automatic fulfillment on reminder date, initialize ₦50 Paystack authorization
    if (body.autoCharge === true) {
      try {
        const initResponse = await Paystack.initializeTransaction({
          amount: PLEDGE_VERIFICATION_AMOUNT_NGN, // ₦50
          email: pledgeData.email,
          causeId: body.causeId,
          full_name: effectiveName,
          serviceFee: 0,
          providerFee: 0,
          callbackUrl: body.callbackUrl || "refreeg://pledge/verify",
          pledgeFlow: "authorization",
          pledgeId: result.data.id,
          pledgeFutureAmount: numAmount,
          reminderDate: body.reminderDate,
        });

        return apiSuccess(
          {
            pledge: result.data,
            autoCharge: true,
            authorization_url: initResponse.authorization_url,
            reference: initResponse.reference,
            access_code: initResponse.access_code,
          },
          201,
        );
      } catch (paystackError: any) {
        console.error("Paystack Pledge Auth Init Error:", paystackError);
        return apiSuccess(
          {
            pledge: result.data,
            autoCharge: false,
            warning:
              "Pledge saved, but card authorization failed. Donor will receive email reminders.",
          },
          201,
        );
      }
    }

    return apiSuccess({ pledge: result.data, autoCharge: false }, 201);
  } catch (error: any) {
    console.error("Mobile API Create Pledge Error:", error);
    return apiError("Internal server error", 500);
  }
}
