import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getCauseAnalytics } from "@/actions/users/dashboard-actions";
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
      return apiError("Invalid cause id", 400);
    }

    const cause = await prisma.cause.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!cause) {
      return apiError("Cause not found", 404);
    }

    if (cause.userId !== user!.id) {
      return apiError("Unauthorized to view analytics for this cause", 403);
    }

    const analytics = await getCauseAnalytics(id);
    return apiSuccess(analytics);
  } catch (error: any) {
    console.error("Mobile API Get Cause Analytics Error:", error);
    return apiError("Internal server error", 500);
  }
}
