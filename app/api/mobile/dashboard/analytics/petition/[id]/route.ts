import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getPetitionAnalytics } from "@/actions/users/dashboard-actions";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/uuid";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return apiError("Invalid petition id", 400);
    }

    const petition = await prisma.petitions.findUnique({
      where: { id },
      select: { user_id: true },
    });

    if (!petition) {
      return apiError("Petition not found", 404);
    }

    if (petition.user_id !== user!.id) {
      return apiError("Unauthorized to view analytics for this petition", 403);
    }

    const analytics = await getPetitionAnalytics(id);
    return apiSuccess(analytics);
  } catch (error: any) {
    console.error("Mobile API Get Petition Analytics Error:", error);
    return apiError("Internal server error", 500);
  }
}
