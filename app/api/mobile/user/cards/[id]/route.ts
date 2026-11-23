import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/uuid";

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * DELETE /api/mobile/user/cards/[id]
 * Remove a saved card belonging to the authenticated user.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authenticateMobileRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const user = authResult.user!;
    const { id } = await params;

    if (!isUuid(id)) {
      return apiError("Invalid card id", 400);
    }

    const card = await prisma.user_saved_cards.findFirst({
      where: {
        id,
        user_id: user.id,
      },
    });

    if (!card) {
      return apiError("Card not found", 404);
    }

    await prisma.user_saved_cards.delete({
      where: { id },
    });

    // If deleted card was default, make another card default if any exists
    if (card.is_default) {
      const nextCard = await prisma.user_saved_cards.findFirst({
        where: { user_id: user.id },
        orderBy: { created_at: "desc" },
      });
      if (nextCard) {
        await prisma.user_saved_cards.update({
          where: { id: nextCard.id },
          data: { is_default: true },
        });
      }
    }

    return apiSuccess({ message: "Card deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting card:", error);
    return apiError(error.message || "Failed to delete card", 500);
  }
}

/**
 * PATCH /api/mobile/user/cards/[id]
 * Set card as default for the user.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authenticateMobileRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const user = authResult.user!;
    const { id } = await params;

    if (!isUuid(id)) {
      return apiError("Invalid card id", 400);
    }

    const card = await prisma.user_saved_cards.findFirst({
      where: { id, user_id: user.id },
    });

    if (!card) {
      return apiError("Card not found", 404);
    }

    const [, updated] = await prisma.$transaction([
      prisma.user_saved_cards.updateMany({
        where: { user_id: user.id },
        data: { is_default: false },
      }),
      prisma.user_saved_cards.update({
        where: { id },
        data: { is_default: true },
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
      }),
    ]);

    return apiSuccess({ card: updated, message: "Default card updated" });
  } catch (error: any) {
    console.error("Error setting default card:", error);
    return apiError(error.message || "Failed to update default card", 500);
  }
}
