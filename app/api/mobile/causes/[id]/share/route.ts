import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { saveCauseShare } from "@/actions/causes/cause-actions";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/uuid";

const SHARE_REWARD_COOLDOWN_MS = 60_000;

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return apiError("Invalid cause id", 400);
    }

    let userId: string | undefined;
    if (request.headers.get("authorization")) {
      const authResult = await authenticateMobileRequest(request);
      userId = authResult.user?.id;
    }

    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_causes_share",
      limit: 10,
      windowMs: 60_000,
      ...(userId ? { identifier: userId } : {}),
    });
    if (rateLimited) return rateLimited;

    let eligibleUserId = userId;
    if (userId) {
      const recentShare = await prisma.events.findFirst({
        where: {
          user_id: userId,
          event_type: "share",
          created_at: {
            gte: new Date(Date.now() - SHARE_REWARD_COOLDOWN_MS),
          },
        },
        select: { id: true },
      });
      if (recentShare) {
        eligibleUserId = undefined;
      }
    }

    await saveCauseShare(id, eligibleUserId);

    return apiSuccess({ message: "Share recorded successfully" });
  } catch (error: any) {
    console.error("Mobile API Share Cause Error:", error);
    return apiError("Internal server error", 500);
  }
}
