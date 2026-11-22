import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import {
  withMobileCache,
  invalidateMobileCachePrefix,
} from "@/lib/api/mobile-cache";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { deleteCause } from "@/actions/causes/cause-actions";
import { listCommentsForCause } from "@/actions/causes/comment-actions";
import { getApprovedProofUpdates } from "@/actions/causes/proof-update-actions";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
import { isUuid } from "@/lib/uuid";
import { prisma } from "@/lib/prisma";

const CAUSE_DETAIL_CACHE_TTL_MS = 5_000;

export async function OPTIONS() {
  return handleCorsPreflight();
}

async function buildCauseDetail(causeRow: any) {
  const [donors, comments, proofUpdates, pledgesData] = await Promise.all([
    prisma.donation
      .findMany({
        where: { causeId: causeRow.id, status: "completed" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          causeId: true,
          amount: true,
          tip_amount: true,
          name: true,
          message: true,
          is_anonymous: true,
          status: true,
          createdAt: true,
        },
      })
      .then((rows) =>
        rows.map((d) => ({
          id: d.id,
          cause_id: d.causeId,
          amount: Number(d.amount),
          tip_amount: Number(d.tip_amount ?? 0),
          name: d.is_anonymous ? "Anonymous" : d.name,
          message: d.message,
          is_anonymous: Boolean(d.is_anonymous),
          status: d.status,
          created_at: d.createdAt?.toISOString() ?? null,
        })),
      )
      .catch(() => []),
    listCommentsForCause(causeRow.id).catch(() => []),
    getApprovedProofUpdates(causeRow.id).catch(() => []),
    prisma.pledges
      .aggregate({
        where: {
          cause_id: causeRow.id,
          status: { in: ["pending", "active", "fulfilled"] },
        },
        _sum: { amount: true },
      })
      .catch(() => null),
  ]);

  const pledged = Number(pledgesData?._sum?.amount ?? 0);

  return {
    id: causeRow.id,
    user_id: causeRow.userId,
    title: causeRow.title,
    slug: causeRow.slug,
    description: causeRow.description,
    category: causeRow.category,
    goal: causeRow.goal ? Number(causeRow.goal) : 0,
    raised: causeRow.raised ? Number(causeRow.raised) : 0,
    shared: causeRow.shared ? Number(causeRow.shared) : 0,
    status: causeRow.status,
    rejection_reason: causeRow.rejectionReason,
    image: causeRow.image,
    days_active: causeRow.daysActive,
    created_at:
      causeRow.createdAt instanceof Date
        ? causeRow.createdAt.toISOString()
        : causeRow.createdAt,
    updated_at:
      causeRow.updatedAt instanceof Date
        ? causeRow.updatedAt.toISOString()
        : causeRow.updatedAt,
    start_date:
      causeRow.start_date instanceof Date
        ? causeRow.start_date.toISOString()
        : causeRow.start_date,
    end_date:
      causeRow.end_date instanceof Date
        ? causeRow.end_date.toISOString()
        : causeRow.end_date,
    paused: Boolean(causeRow.paused),
    compliance_paused: Boolean(causeRow.compliance_paused),
    user: {
      name: causeRow.user?.fullName || "Anonymous",
      username: causeRow.user?.username || null,
      profile_photo: causeRow.user?.profilePhoto || null,
      is_verified: Boolean(causeRow.user?.isVerified),
    },
    sections: causeRow.sections || [],
    multimedia: causeRow.multimedia || [],
    video_links: causeRow.videoLinks || [],
    trust_score: causeRow.trust_score || {
      impact: "B+",
      readability: "A",
      transparency: "High",
    },
    verified_status: causeRow.verified_status || "pending",
    summary: causeRow.summary || null,
    location: causeRow.location || null,
    faqs: causeRow.faqs || [],
    pledged,
    donors,
    comments,
    proof_updates: proofUpdates,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return apiError("Cause not found", 404);
    }

    let authUserId: string | undefined;
    if (request.headers.get("authorization")) {
      const authResult = await authenticateMobileRequest(request);
      authUserId = authResult.user?.id;
    }

    const causeRow = await prisma.cause.findUnique({
      where: isUuid(id) ? { id } : { slug: id },
      include: {
        user: {
          select: {
            fullName: true,
            username: true,
            profilePhoto: true,
            isVerified: true,
          },
        },
        sections: {
          select: {
            id: true,
            heading: true,
            description: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!causeRow) {
      return apiError("Cause not found", 404);
    }

    const isPublic =
      causeRow.status === "approved" && !causeRow.compliance_paused;

    if (!isPublic && authUserId !== causeRow.userId) {
      return apiError("Cause not found", 404);
    }

    const detail = isPublic
      ? await withMobileCache(
          `causes:detail:${causeRow.id}`,
          CAUSE_DETAIL_CACHE_TTL_MS,
          () => buildCauseDetail(causeRow),
        )
      : await buildCauseDetail(causeRow);

    let isFollowing = false;
    if (authUserId) {
      const followData = await prisma.campaign_follows.findFirst({
        where: { cause_id: causeRow.id, user_id: authUserId },
        select: { id: true },
      });
      isFollowing = Boolean(followData);
    }

    return apiSuccess({
      ...detail,
      isFollowing,
    });
  } catch (error: any) {
    console.error("Mobile API Get Cause Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(
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
    const body = await request.json();

    const existingCause = await prisma.cause.findUnique({
      where: { id },
    });

    if (!existingCause) {
      return apiError("Cause not found", 404);
    }

    if (existingCause.userId !== user!.id) {
      return apiError("Unauthorized to update this cause", 403);
    }

    if (
      body.coverImageS3Key &&
      !isOwnUploadKey(body.coverImageS3Key, "causes", user!.id)
    ) {
      return apiError("Invalid cover image upload key", 400);
    }

    if (body.multimediaS3Keys !== undefined) {
      if (
        !Array.isArray(body.multimediaS3Keys) ||
        body.multimediaS3Keys.some(
          (k: unknown) => !isOwnUploadKey(k, "causes", user!.id),
        )
      ) {
        return apiError("Invalid multimedia upload key", 400);
      }
    }

    // Bypass 'updateCause' action for the same reason as create (file uploads)
    // Instead we create the pending edit directly
    const existingEdit = await prisma.cause_edits.findFirst({
      where: { original_cause_id: id, status: "pending" },
    });

    if (existingEdit) {
      return apiError("You already have a pending edit for this cause.", 400);
    }

    let daysActive = null;
    if (body.startDate && body.endDate) {
      const startDate = new Date(body.startDate);
      const endDate = new Date(body.endDate);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        daysActive = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      }
    }

    let parsedEditGoal = Math.round(Number(existingCause.goal));
    if (body.goal !== undefined && body.goal !== null) {
      const numGoal = Number(body.goal);
      if (!Number.isFinite(numGoal) || numGoal <= 0) {
        return apiError("Goal must be a positive number", 400);
      }
      parsedEditGoal = Math.round(numGoal);
    }

    const editData = await prisma.$transaction(async (tx) => {
      const edit = await tx.cause_edits.create({
        data: {
          original_cause_id: id,
          user_id: user!.id,
          title: body.title || existingCause.title,
          category: body.category || existingCause.category,
          goal: parsedEditGoal,
          image: body.coverImageS3Key || existingCause.image,
          days_active: daysActive || existingCause.daysActive,
          start_date: body.startDate
            ? new Date(body.startDate)
            : existingCause.start_date,
          end_date: body.endDate
            ? new Date(body.endDate)
            : existingCause.end_date,
          multimedia: body.multimediaS3Keys || existingCause.multimedia,
          video_links: body.video_links || existingCause.videoLinks,
          summary: body.summary || existingCause.summary,
          location: body.location || existingCause.location,
          status: "pending",
        },
      });

      if (body.sections && body.sections.length > 0) {
        await tx.cause_edit_sections.createMany({
          data: body.sections.map((section: any) => ({
            cause_edit_id: edit.id,
            heading: section.heading,
            description: section.description,
          })),
        });
      }

      return edit;
    });

    invalidateMobileCachePrefix("causes:");
    return apiSuccess(editData, 202);
  } catch (error: any) {
    console.error("Mobile API Update Cause Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
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

    const existingCause = await prisma.cause.findUnique({
      where: { id },
    });

    if (!existingCause) {
      return apiError("Cause not found", 404);
    }

    if (existingCause.userId !== user!.id) {
      return apiError("Unauthorized to delete this cause", 403);
    }

    await deleteCause(id);
    invalidateMobileCachePrefix("causes:");

    return apiSuccess({ message: "Cause deleted successfully" });
  } catch (error: any) {
    console.error("Mobile API Delete Cause Error:", error);
    return apiError("Internal server error", 500);
  }
}
