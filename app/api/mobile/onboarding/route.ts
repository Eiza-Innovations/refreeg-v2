import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  getOnboardingData,
  getCurrentOnboardingStep,
  checkUsernameAvailability,
} from "@/actions/users/profile-actions";
import {
  createOnboardingProfileCore,
  OnboardingValidationError,
  resolveAllowedAvatarRef,
} from "@/lib/users/profile-core";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
import { prisma } from "@/lib/prisma";
import type { OnboardingProfileData } from "@/types";

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

const onboardingProfileSchema = z
  .object({
    firstName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
    fullName: z.string().trim().max(200).optional(),
    displayName: z
      .string()
      .trim()
      .max(100, "Display name cannot exceed 100 characters")
      .nullable()
      .optional(),
    username: z.string().trim().max(50).optional(),
    bio: z
      .string()
      .trim()
      .max(500, "Bio cannot exceed 500 characters")
      .nullable()
      .optional(),
    location: z.string().trim().max(200).optional(),
    phone: z.string().trim().max(40).optional(),
    email: z.string().trim().max(255).optional(),
    accountType: z.string().trim().max(40).optional(),
    gender: z.string().trim().max(32).optional(),
    profilePhoto: z.string().nullable().optional(),
  })
  .passthrough();

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const [onboardingData, currentStep, userRecord] = await Promise.all([
      getOnboardingData(user!.id),
      getCurrentOnboardingStep(user!.id),
      prisma.user.findUnique({
        where: { id: user!.id },
        select: {
          accountType: true,
          interests: true,
          onboarding_completed: true,
        },
      }),
    ]);

    return apiSuccess({
      data: onboardingData,
      currentStep,
      onboardingCompleted: userRecord?.onboarding_completed ?? false,
      accountType: userRecord?.accountType ?? "individual",
      interests: userRecord?.interests ?? [],
    });
  } catch (error) {
    console.error("Mobile API Get Onboarding Data Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return apiError("Invalid JSON request body", 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return apiError("Invalid JSON request body", 400);
  }

  try {
    const { profileData, oauthAvatarUrl } = body;

    if (
      !profileData ||
      typeof profileData !== "object" ||
      Array.isArray(profileData)
    ) {
      return apiError("Missing required field (profileData)", 400);
    }

    const parsedProfile = onboardingProfileSchema.safeParse(profileData);
    if (!parsedProfile.success) {
      return apiError(
        parsedProfile.error.issues[0]?.message || "Invalid profileData",
        400,
      );
    }

    const sanitizedProfileData: Record<string, unknown> = {
      ...parsedProfile.data,
    };

    if (
      typeof sanitizedProfileData.username === "string" &&
      sanitizedProfileData.username.length > 0
    ) {
      const normalizedUsername = sanitizedProfileData.username.toLowerCase();
      if (!USERNAME_PATTERN.test(normalizedUsername)) {
        return apiError(
          "Username must be 3-30 characters using only letters, numbers, and underscores.",
          400,
        );
      }
      sanitizedProfileData.username = normalizedUsername;

      const isAvailable = await checkUsernameAvailability(
        normalizedUsername,
        user!.id,
      );
      if (!isAvailable) {
        return apiError(
          "This username is already taken. Please choose another.",
          409,
        );
      }
    }

    let resolvedOAuthAvatar: string | null = null;
    if (
      oauthAvatarUrl !== undefined &&
      oauthAvatarUrl !== null &&
      oauthAvatarUrl !== ""
    ) {
      if (typeof oauthAvatarUrl !== "string") {
        return apiError("Invalid OAuth avatar URL", 400);
      }
      resolvedOAuthAvatar = resolveAllowedAvatarRef(oauthAvatarUrl, user!.id);
      if (!resolvedOAuthAvatar) {
        return apiError("Invalid OAuth avatar URL", 400);
      }
    }

    if (sanitizedProfileData.profilePhoto !== undefined) {
      if (sanitizedProfileData.profilePhoto === null) {
        delete sanitizedProfileData.profilePhoto;
      } else {
        const trimmedPhoto = String(sanitizedProfileData.profilePhoto).trim();
        if (!trimmedPhoto) {
          delete sanitizedProfileData.profilePhoto;
        } else {
          if (!isOwnUploadKey(trimmedPhoto, "profiles", user!.id)) {
            return apiError("Invalid profile photo upload key", 400);
          }
          sanitizedProfileData.profilePhoto = trimmedPhoto;
        }
      }
    }

    const updatedUser = await createOnboardingProfileCore(
      user!.id,
      sanitizedProfileData as unknown as OnboardingProfileData,
      resolvedOAuthAvatar,
    );

    return apiSuccess(updatedUser);
  } catch (error) {
    if (error instanceof OnboardingValidationError) {
      return apiError(error.message, error.statusCode);
    }
    if ((error as { code?: string })?.code === "P2002") {
      return apiError(
        "This username is already taken. Please choose another.",
        409,
      );
    }
    console.error("Mobile API Save Onboarding Profile Error:", error);
    const msg = error instanceof Error ? error.message : "";
    const isLegacyValidationError =
      msg.includes("18 or over") ||
      msg.includes("date of birth") ||
      msg.includes("first and last name") ||
      msg.includes("Invalid profile photo upload key") ||
      msg.includes("Invalid OAuth avatar URL");
    if (isLegacyValidationError) {
      return apiError(msg, 400);
    }
    return apiError("Internal server error", 500);
  }
}
