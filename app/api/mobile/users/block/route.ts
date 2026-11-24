import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { isUuid } from "@/lib/uuid";
import {
  blockUserForModeration,
  getBlockedUserIds,
  ModerationValidationError,
  unblockUserForModeration,
} from "@/lib/moderation/moderation-service";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateMobileRequest(request);
    if (errorResponse || !user) return errorResponse!;

    const blockedUserIds = await getBlockedUserIds(user.id);
    return apiSuccess({ blockedUserIds });
  } catch (error) {
    console.error("[GET /api/mobile/users/block] Error:", error);
    return apiError("Failed to fetch blocked users.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateMobileRequest(request);
    if (errorResponse || !user) return errorResponse!;

    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_users_block",
      limit: 20,
      windowMs: 60_000,
      identifier: user.id,
    });
    if (rateLimited) return rateLimited;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return apiError("Invalid JSON request body", 400);
    }

    let blockedUserId: string | null = null;
    if (body.blockedUserId !== undefined && body.blockedUserId !== null) {
      if (
        typeof body.blockedUserId !== "string" ||
        !isUuid(body.blockedUserId.trim())
      ) {
        return apiError("Invalid blockedUserId format", 400);
      }
      blockedUserId = body.blockedUserId.trim();
    }

    let commentId: string | null = null;
    if (body.commentId !== undefined && body.commentId !== null) {
      if (
        typeof body.commentId !== "string" ||
        !isUuid(body.commentId.trim())
      ) {
        return apiError("Invalid commentId format", 400);
      }
      commentId = body.commentId.trim();
    }

    if (!blockedUserId && !commentId) {
      return apiError("blockedUserId or commentId is required", 400);
    }

    if (blockedUserId && blockedUserId === user.id) {
      return apiError("You cannot block yourself.", 400);
    }

    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim().slice(0, 255)
        : "Blocked by user for objectionable content";

    const result = await blockUserForModeration({
      blockerUserId: user.id,
      blockedUserId,
      commentId,
      reason,
    });

    return apiSuccess(
      {
        blockedUserId: result.blockedUserId,
        reportId: result.reportId,
        message:
          "User blocked. Their content is now hidden from your feed and our moderation team has been notified.",
      },
      201,
    );
  } catch (error) {
    if (error instanceof ModerationValidationError) {
      return apiError(error.message, error.statusCode);
    }
    console.error("[POST /api/mobile/users/block] Error:", error);
    return apiError("Unable to block user right now.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse || !user) return errorResponse!;

  const rateLimited = enforceRateLimit(request, {
    namespace: "mobile_users_unblock",
    limit: 20,
    windowMs: 60_000,
    identifier: user.id,
  });
  if (rateLimited) return rateLimited;

  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return apiError("Invalid JSON request body", 400);
    }

    if (
      typeof body.blockedUserId !== "string" ||
      !isUuid(body.blockedUserId.trim())
    ) {
      return apiError("Valid blockedUserId is required", 400);
    }
    const blockedUserId = body.blockedUserId.trim();

    await unblockUserForModeration({
      blockerUserId: user.id,
      blockedUserId,
    });

    return apiSuccess({
      blockedUserId,
      message: "User unblocked.",
    });
  } catch (error) {
    console.error("[DELETE /api/mobile/users/block] Error:", error);
    return apiError("Unable to unblock user right now.", 500);
  }
}
