import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  apiPaginated,
  handleCorsPreflight,
} from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { listCauses, countCauses } from "@/actions/causes/cause-actions";
import {
  hasBankDetails,
  isProfileComplete,
} from "@/actions/users/profile-actions";
import {
  withMobileCache,
  invalidateMobileCachePrefix,
} from "@/lib/api/mobile-cache";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
import { prisma } from "@/lib/prisma";

function stripCreatorSecrets(cause: any) {
  if (!cause || typeof cause !== "object") return cause;
  const sanitized = { ...cause };
  if (sanitized.user && typeof sanitized.user === "object") {
    const {
      email: _e,
      sub_account_code: _s1,
      subAccountCode: _s2,
      ...safeUser
    } = sanitized.user;
    sanitized.user = safeUser;
  }
  if (sanitized.profiles && typeof sanitized.profiles === "object") {
    const {
      email: _pe,
      sub_account_code: _ps1,
      subAccountCode: _ps2,
      ...safeProfiles
    } = sanitized.profiles;
    sanitized.profiles = safeProfiles;
  }
  return sanitized;
}

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const status = "approved";
    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "latest";
    const rawLimit = parseInt(searchParams.get("limit") || "10", 10);
    const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 10 : rawLimit, 1), 50);
    const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0);

    const options: any = {
      category,
      status,
      search,
      sortBy,
      limit,
      offset,
    };

    const cacheKey = `causes:${category || ""}:${status}:${search || ""}:${sortBy}:${limit}:${offset}`;
    const [causes, total] = await withMobileCache(cacheKey, 5000, () =>
      Promise.all([listCauses(options), countCauses(options)]),
    );

    return apiPaginated(causes.map(stripCreatorSecrets), total, limit, offset);
  } catch (error: any) {
    console.error("Mobile API Get Causes Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const [hasBankInfo, profileStatus] = await Promise.all([
      hasBankDetails(user!.id),
      isProfileComplete(user!.id),
    ]);

    if (!hasBankInfo || !profileStatus.isComplete) {
      const missing: string[] = [];
      if (!hasBankInfo) missing.push("bank details");
      if (!profileStatus.isComplete) {
        missing.push(...profileStatus.missingFields);
      }
      return apiError(
        `Please complete your ${missing.join(" and ")} before creating a cause.`,
        403,
      );
    }

    const body = await request.json();

    // We need to bypass the 'createCause' server action because it expects a 'File' object
    // for coverImage and multimedia. The mobile app will send S3 keys instead.

    if (!body.title || !body.category || !body.goal) {
      return apiError("Missing required fields (title, category, goal)", 400);
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

    const causeId = crypto.randomUUID();
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

    const cause = await prisma.$transaction(async (tx: any) => {
      const newCause = await tx.cause.create({
        data: {
          id: causeId,
          userId: user!.id,
          title: body.title,
          category: body.category,
          goal:
            typeof body.goal === "string"
              ? Number.parseFloat(body.goal)
              : body.goal,
          status: "pending",
          image: body.coverImageS3Key || null,
          daysActive: daysActive,
          start_date: body.startDate ? new Date(body.startDate) : null,
          end_date: body.endDate ? new Date(body.endDate) : null,
          multimedia: body.multimediaS3Keys || [],
          videoLinks: body.video_links || [],
          summary: body.summary || null,
          location: body.location || null,
        },
      });

      if (body.sections && body.sections.length > 0) {
        await tx.cause_sections.createMany({
          data: body.sections.map((section: any) => ({
            cause_id: newCause.id,
            heading: section.heading,
            description: section.description,
          })),
        });
      }

      return newCause;
    });

    await Promise.allSettled([
      (async () => {
        try {
          const { createNotification } =
            await import("@/lib/notifications/notification-service");
          await createNotification({
            userId: user!.id,
            title: "Campaign submitted for review 🚀",
            message: `Your campaign "${body.title}" has been submitted and is currently with the review team.`,
            type: "cause_created",
            data: { causeId: cause.id },
          });
        } catch (notifErr) {
          console.warn("Failed to create campaign notification:", notifErr);
        }
      })(),
      (async () => {
        try {
          const profile = await prisma.user.findUnique({
            where: { id: user!.id },
            select: { fullName: true, email: true },
          });

          if (profile?.email) {
            const baseUrl =
              process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";
            const reviewUrl = `${baseUrl}/dashboard/admin/causes?tab=pending`;

            const {
              sendCauseSubmissionAdminNotification,
              sendCauseUnderReviewEmail,
            } = await import("@/services/mail");

            sendCauseSubmissionAdminNotification(
              profile.fullName || "User",
              profile.email,
              body.title,
              reviewUrl,
            ).catch((err) => console.error("Admin notification error:", err));

            sendCauseUnderReviewEmail({
              causeName: body.title,
              dashboardUrl: `${baseUrl}/dashboard/causes`,
              userEmail: profile.email,
              userName: profile.fullName || "User",
            }).catch((err) =>
              console.error("User email notification error:", err),
            );
          }
        } catch (mailErr) {
          console.warn("Failed to dispatch campaign emails:", mailErr);
        }
      })(),
    ]);

    invalidateMobileCachePrefix("causes:");
    return apiSuccess(cause, 201);
  } catch (error: any) {
    console.error("Mobile API Create Cause Error:", error);
    return apiError("Internal server error", 500);
  }
}
