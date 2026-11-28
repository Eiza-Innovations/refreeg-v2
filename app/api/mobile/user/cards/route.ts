import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";
import Paystack from "@/services/paystack";
import {
  decodeStoreReviewDemoReference,
  isStoreReviewDemoAccount,
  STORE_REVIEW_DEMO_SAVED_CARD,
} from "@/lib/auth/store-review-demo";

const MAX_TRACKED_SETUP_REFUNDS = 2_000;
const inflightCardSaves = new Set<string>();
const refundedSetupReferences = new Set<string>();

function trackRefundedSetupReference(ref: string) {
  if (refundedSetupReferences.size >= MAX_TRACKED_SETUP_REFUNDS) {
    const oldest = refundedSetupReferences.values().next().value;
    if (oldest) refundedSetupReferences.delete(oldest);
  }
  refundedSetupReferences.add(ref);
}

function formatSavedCardResponse(card: any) {
  return {
    id: card.id,
    card_type: card.card_type,
    last4: card.last4,
    exp_month: card.exp_month,
    exp_year: card.exp_year,
    bank: card.bank,
    brand: card.brand,
    is_default: card.is_default,
  };
}

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * GET /api/mobile/user/cards
 * List all saved cards for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateMobileRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const user = authResult.user!;

    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_user_cards",
      limit: 15,
      windowMs: 60_000,
      identifier: user.id,
    });
    if (rateLimited) return rateLimited;

    if (isStoreReviewDemoAccount(user.email)) {
      return apiSuccess({ cards: [STORE_REVIEW_DEMO_SAVED_CARD] });
    }

    const cards = await prisma.user_saved_cards.findMany({
      where: { user_id: user.id },
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        card_type: true,
        last4: true,
        exp_month: true,
        exp_year: true,
        bank: true,
        brand: true,
        is_default: true,
        created_at: true,
      },
    });

    return apiSuccess({ cards });
  } catch (error: any) {
    console.error("Error fetching user saved cards:", error);
    return apiError("Failed to fetch saved cards", 500);
  }
}

/**
 * POST /api/mobile/user/cards
 * Verify a Paystack transaction reference from in-app card setup (₦50 authorization charge)
 * or an in-app donation, extract card authorization details, save the card token for future
 * 1-click charges, and automatically refund the ₦50 verification charge when applicable.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateMobileRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const user = authResult.user!;

    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_user_cards",
      limit: 15,
      windowMs: 60_000,
      identifier: user.id,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { reference, refundSetupCharge = false } = body;

    if (!reference || typeof reference !== "string" || !reference.trim()) {
      return apiError("Missing transaction reference", 400);
    }

    const trimmedReference = reference.trim();

    if (
      isStoreReviewDemoAccount(user.email) &&
      decodeStoreReviewDemoReference(trimmedReference)
    ) {
      return apiSuccess(
        {
          card: STORE_REVIEW_DEMO_SAVED_CARD,
          refundInitiated: Boolean(refundSetupCharge),
          message: refundSetupCharge
            ? "Card saved and ₦50 verification charge refunded"
            : "Card saved successfully",
        },
        201,
      );
    }

    if (inflightCardSaves.has(trimmedReference)) {
      return apiError("Card verification is already in progress", 409);
    }

    inflightCardSaves.add(trimmedReference);
    try {
      const tx = (await Paystack.verifyTransactionFull(trimmedReference)) as {
        status?: string;
        amount?: number;
        metadata?: {
          cause_id?: string;
          purpose?: string;
          email?: string;
          user_id?: string;
        };
        authorization?: {
          authorization_code?: string;
          card_type?: string;
          last4?: string;
          exp_month?: string;
          exp_year?: string;
          bin?: string;
          bank?: string;
          brand?: string;
          signature?: string;
          reusable?: boolean;
        };
        customer?: {
          email?: string;
        };
      };

      if (tx.status !== "success") {
        return apiError("Transaction was not successful", 400);
      }

      const auth = tx.authorization;
      if (!auth?.authorization_code || !auth.last4) {
        return apiError(
          "Card authorization data could not be retrieved from provider",
          400,
        );
      }

      const txUserId = tx.metadata?.user_id;
      if (!txUserId || txUserId !== user.id) {
        return apiError(
          "Transaction does not belong to authenticated user",
          403,
        );
      }

      const cardLookupWhere = auth.signature
        ? { user_id: user.id, signature: auth.signature }
        : { user_id: user.id, authorization_code: auth.authorization_code };

      let txOutcome: { card: any; created: boolean };
      try {
        txOutcome = await prisma.$transaction(async (db) => {
          const duplicate = await db.user_saved_cards.findFirst({
            where: cardLookupWhere,
          });
          if (duplicate) {
            return { card: duplicate, created: false };
          }

          const existingCardsCount = await db.user_saved_cards.count({
            where: { user_id: user.id },
          });

          const createdCard = await db.user_saved_cards.create({
            data: {
              user_id: user.id,
              authorization_code: auth.authorization_code!,
              card_type: auth.card_type || "visa",
              last4: auth.last4!,
              exp_month: auth.exp_month || "12",
              exp_year: auth.exp_year || "30",
              bin: auth.bin || null,
              bank: auth.bank || "Card Issuer",
              brand: auth.brand || auth.card_type || "Card",
              signature: auth.signature || null,
              email: tx.customer?.email || user.email,
              is_default: existingCardsCount === 0,
            },
          });

          return { card: createdCard, created: true };
        });
      } catch (dbErr) {
        if ((dbErr as { code?: string } | null)?.code === "P2002") {
          const existing = await prisma.user_saved_cards.findFirst({
            where: cardLookupWhere,
          });
          if (existing) {
            txOutcome = { card: existing, created: false };
          } else {
            throw dbErr;
          }
        } else {
          throw dbErr;
        }
      }

      const savedCard = txOutcome.card;

      const CARD_SETUP_KOBO = 5000; // ₦50.00 in Paystack kobo units (100 kobo = ₦1)
      const isSetupTx =
        (tx.metadata?.cause_id === "card_setup" ||
          tx.metadata?.purpose === "card_setup") &&
        typeof tx.amount === "number" &&
        tx.amount > 0 &&
        tx.amount <= CARD_SETUP_KOBO;

      let refundInitiated = false;
      if (isSetupTx && !refundedSetupReferences.has(trimmedReference)) {
        try {
          await Paystack.refundTransaction(
            trimmedReference,
            Math.min(tx.amount || CARD_SETUP_KOBO, CARD_SETUP_KOBO),
          );
          trackRefundedSetupReference(trimmedReference);
          refundInitiated = true;
        } catch (refundErr) {
          console.warn(
            "Non-fatal: Could not auto-refund ₦50 card setup charge immediately:",
            refundErr,
          );
        }
      }

      if (!txOutcome.created) {
        return apiSuccess({
          card: formatSavedCardResponse(savedCard),
          refundInitiated,
          message: refundInitiated
            ? "Card already saved and ₦50 verification charge refunded"
            : "Card already saved",
        });
      }

      return apiSuccess(
        {
          card: formatSavedCardResponse(savedCard),
          refundInitiated,
          message: refundInitiated
            ? "Card saved and ₦50 verification charge refunded"
            : "Card saved successfully",
        },
        201,
      );
    } finally {
      inflightCardSaves.delete(trimmedReference);
    }
  } catch (error: any) {
    console.error("Error saving card:", error);
    return apiError("Failed to save card", 500);
  }
}
