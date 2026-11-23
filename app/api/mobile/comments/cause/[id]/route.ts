import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  apiPaginated,
  handleCorsPreflight,
} from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/uuid";
import { createComment } from "@/actions/causes/comment-actions";
import { getBlockedUserIds } from "@/lib/moderation/moderation-service";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return apiError("Invalid cause id format", 400);
    }

    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
    const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 20 : rawLimit, 1), 100);
    const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0);

    let blockedUserIds: string[] = [];
    if (request.headers.get("authorization")) {
      const authResult = await authenticateMobileRequest(request);
      if (authResult.errorResponse) return authResult.errorResponse;
      blockedUserIds = await getBlockedUserIds(authResult.user!.id);
    }

    const causeExists = await prisma.cause.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!causeExists) {
      return apiError("Cause not found", 404);
    }

    const whereClause = {
      cause_id: id,
      parent_id: null,
      ...(blockedUserIds.length > 0
        ? { user_id: { notIn: blockedUserIds } }
        : {}),
    };

    const [topLevelComments, total] = await Promise.all([
      prisma.comments.findMany({
        where: whereClause,
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              profilePhoto: true,
            },
          },
        },
      }),
      prisma.comments.count({
        where: whereClause,
      }),
    ]);

    const parentIds = topLevelComments.map((c) => c.id);
    const repliesList =
      parentIds.length > 0
        ? await prisma.comments.findMany({
            where: {
              parent_id: { in: parentIds },
              ...(blockedUserIds.length > 0
                ? { user_id: { notIn: blockedUserIds } }
                : {}),
            },
            orderBy: { created_at: "asc" },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  username: true,
                  profilePhoto: true,
                },
              },
            },
          })
        : [];

    const repliesByParent = new Map<string, typeof repliesList>();
    for (const reply of repliesList) {
      if (!reply.parent_id) continue;
      const list = repliesByParent.get(reply.parent_id) ?? [];
      list.push(reply);
      repliesByParent.set(reply.parent_id, list);
    }

    const comments = topLevelComments.map((comment) => ({
      ...comment,
      replies: repliesByParent.get(comment.id) ?? [],
    }));

    return apiPaginated(comments, total, limit, offset);
  } catch (error: any) {
    console.error("Mobile API Get Cause Comments Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse || !user) return errorResponse!;

  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return apiError("Invalid cause id format", 400);
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return apiError("Invalid JSON request body", 400);
    }

    if (typeof body.content !== "string" || !body.content.trim()) {
      return apiError("Missing required field (content)", 400);
    }
    const content = body.content.trim();
    if (content.length > 2000) {
      return apiError("Comment cannot exceed 2000 characters", 400);
    }

    let parentId: string | undefined;
    if (body.parentId !== undefined && body.parentId !== null) {
      if (typeof body.parentId !== "string" || !isUuid(body.parentId.trim())) {
        return apiError("Invalid parentId format", 400);
      }
      parentId = body.parentId.trim();
    }

    const causeExists = await prisma.cause.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!causeExists) {
      return apiError("Cause not found", 404);
    }

    const newComment = await createComment(id, user.id, content, parentId);

    return apiSuccess(newComment, 201);
  } catch (error: any) {
    console.error("Mobile API Create Comment Error:", error);
    return apiError("Internal server error", 500);
  }
}
