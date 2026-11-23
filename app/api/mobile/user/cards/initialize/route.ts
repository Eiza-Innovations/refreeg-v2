import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import Paystack from "@/services/paystack";

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * POST /api/mobile/user/cards/initialize
 * Initializes a ₦50 card setup transaction with Paystack to tokenize the card.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateMobileRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const user = authResult.user!;

    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_user_cards_initialize",
      limit: 10,
      windowMs: 60_000,
      identifier: user.id,
    });
    if (rateLimited) return rateLimited;

    // ₦50 charge (5000 kobo)
    const response = await Paystack.initializeTransaction({
      amount: 50,
      email: user.email,
      causeId: "card_setup",
      full_name: user.fullName || "Supporter",
      serviceFee: 0,
      providerFee: 0,
      callbackUrl: "refreeg://payment/card-setup",
      // Metadata to identify this as a card setup authorization
      id: user.id,
    });

    return apiSuccess({
      authorization_url: response.authorization_url,
      reference: response.reference,
      access_code: response.access_code,
      amount: 50,
    });
  } catch (error: any) {
    console.error("Error initializing card setup:", error);
    return apiError(error.message || "Failed to initialize card setup", 500);
  }
}
