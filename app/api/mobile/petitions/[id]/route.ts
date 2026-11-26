import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import {
  withMobileCache,
  invalidateMobileCachePrefix,
} from "@/lib/api/mobile-cache";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { removePetition } from "@/lib/petitions/remove-petition";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
import { isUuid } from "@/lib/uuid";
import { prisma } from "@/lib/prisma";

const PETITION_DETAIL_CACHE_TTL_MS = 5_000;

export async function OPTIONS() {
  return handleCorsPreflight();
}

function mapPublicPetitionDetail(petition: any) {
  return {
    ...petition,
    goal: Number(petition.goal),
    raised: Number(petition.raised),
    created_at: petition.created_at.toISOString(),
    updated_at: petition.updated_at.toISOString(),
    user: {
      name: petition.user?.fullName || "Anonymous",
      profile_photo: petition.user?.profilePhoto || null,
    },
    sections: petition.petition_sections || [],
    multimedia: petition.multimedia || [],
    video_links: petition.video_links || [],
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return apiError("Petition not found", 404);
    }

    let authUserId: string | undefined;
    if (request.headers.get("authorization")) {
      const authResult = await authenticateMobileRequest(request);
      authUserId = authResult.user?.id;
    }

    const petition = await prisma.petitions.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            fullName: true,
            profilePhoto: true,
          },
        },
        petition_sections: {
          select: { id: true, heading: true, description: true },
        },
      },
    });

    if (!petition) {
      return apiError("Petition not found", 404);
    }

    const isPublic =
      petition.status !== "pending" && petition.status !== "rejected";

    if (!isPublic && authUserId !== petition.user_id) {
      return apiError("Petition not found", 404);
    }

    const mapped = isPublic
      ? await withMobileCache(
          `petitions:detail:${id}`,
          PETITION_DETAIL_CACHE_TTL_MS,
          async () => mapPublicPetitionDetail(petition),
        )
      : mapPublicPetitionDetail(petition);

    return apiSuccess(mapped);
  } catch (error: any) {
    console.error("Mobile API Get Petition Error:", error);
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
      return apiError("Invalid petition id", 400);
    }
    const body = await request.json();

    const existingPetition = await prisma.petitions.findUnique({
      where: { id },
    });

    if (!existingPetition) {
      return apiError("Petition not found", 404);
    }

    if (existingPetition.user_id !== user!.id) {
      return apiError("Unauthorized to update this petition", 403);
    }

    if (
      body.coverImageS3Key &&
      !isOwnUploadKey(body.coverImageS3Key, "petitions", user!.id)
    ) {
      return apiError("Invalid cover image upload key", 400);
    }

    if (body.multimediaS3Keys !== undefined) {
      if (
        !Array.isArray(body.multimediaS3Keys) ||
        body.multimediaS3Keys.some(
          (k: unknown) => !isOwnUploadKey(k, "petitions", user!.id),
        )
      ) {
        return apiError("Invalid multimedia upload key", 400);
      }
    }

    const existingEdit = await prisma.petition_edits.findFirst({
      where: { original_petition_id: id, status: "pending" },
    });

    if (existingEdit) {
      return apiError(
        "You already have a pending edit for this petition.",
        400,
      );
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

    const rawGoal = body.goal ?? body.targetSignatures;
    let parsedGoal = existingPetition.goal;
    if (rawGoal !== undefined && rawGoal !== null) {
      const numGoal = Number(rawGoal);
      if (!Number.isFinite(numGoal) || numGoal <= 0) {
        return apiError("Target signatures must be a positive number", 400);
      }
      parsedGoal = Math.round(numGoal);
    }

    const editData = await prisma.$transaction(async (tx) => {
      const edit = await tx.petition_edits.create({
        data: {
          original_petition_id: id,
          user_id: user!.id,
          title: body.title || existingPetition.title,
          category: body.category || existingPetition.category,
          goal: parsedGoal,
          image: body.coverImageS3Key || existingPetition.image,
          days_active: daysActive || existingPetition.days_active,
          multimedia: body.multimediaS3Keys || existingPetition.multimedia,
          video_links: body.video_links || existingPetition.video_links,
          status: "pending",
        },
      });

      if (body.sections && body.sections.length > 0) {
        await tx.petition_edit_sections.createMany({
          data: body.sections.map((section: any) => ({
            petition_edit_id: edit.id,
            heading: section.heading,
            description: section.description,
          })),
        });
      }

      return edit;
    });

    invalidateMobileCachePrefix("petitions:");
    return apiSuccess(editData, 202);
  } catch (error: any) {
    console.error("Mobile API Update Petition Error:", error);
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
      return apiError("Invalid petition id", 400);
    }

    const existingPetition = await prisma.petitions.findUnique({
      where: { id },
    });

    if (!existingPetition) {
      return apiError("Petition not found", 404);
    }

    if (existingPetition.user_id !== user!.id) {
      return apiError("Unauthorized to delete this petition", 403);
    }

    await removePetition(id);
    invalidateMobileCachePrefix("petitions:");

    return apiSuccess({ message: "Petition deleted successfully" });
  } catch (error: any) {
    console.error("Mobile API Delete Petition Error:", error);
    return apiError("Internal server error", 500);
  }
}
