import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  getOnboardingData,
  getCurrentOnboardingStep,
  checkUsernameAvailability,
} from "@/actions/users/profile-actions";
import { createOnboardingProfileCore } from "@/lib/users/profile-core";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
import { prisma } from "@/lib/prisma";

const ALLOWED_OAUTH_AVATAR_HOSTS = [
  "lh3.googleusercontent.com",
  "googleusercontent.com",
  "graph.facebook.com",
  "avatars.githubusercontent.com",
];

function isAllowedOAuthAvatarUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_OAUTH_AVATAR_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

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
          gender: true,
          firstName: true,
          lastName: true,
          fullName: true,
          displayName: true,
          username: true,
          bio: true,
          location: true,
          phone: true,
          email: true,
          profilePhoto: true,
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
  } catch (error: any) {
    console.error("Mobile API Get Onboarding Data Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { profileData, oauthAvatarUrl } = body;

    if (!profileData) {
      return apiError("Missing required field (profileData)", 400);
    }

    if (profileData.username) {
      const isAvailable = await checkUsernameAvailability(
        profileData.username,
        user!.id,
      );
      if (!isAvailable) {
        return apiError(
          "This username is already taken. Please choose another.",
          409,
        );
      }
    }

    if (
      oauthAvatarUrl !== undefined &&
      oauthAvatarUrl !== null &&
      oauthAvatarUrl !== ""
    ) {
      if (
        typeof oauthAvatarUrl !== "string" ||
        (!isOwnUploadKey(oauthAvatarUrl, "profiles", user!.id) &&
          !isAllowedOAuthAvatarUrl(oauthAvatarUrl))
      ) {
        return apiError("Invalid OAuth avatar URL", 400);
      }
    }

    let profilePhotoUrl: string | null =
      typeof oauthAvatarUrl === "string" && oauthAvatarUrl
        ? oauthAvatarUrl
        : null;
    if (
      profileData.profilePhoto &&
      typeof profileData.profilePhoto === "string"
    ) {
      if (!isOwnUploadKey(profileData.profilePhoto, "profiles", user!.id)) {
        return apiError("Invalid profile photo upload key", 400);
      }
      profilePhotoUrl = profileData.profilePhoto;
      delete profileData.profilePhoto;
    }

    const updatedUser = await createOnboardingProfileCore(
      user!.id,
      profileData,
      profilePhotoUrl,
    );

    return apiSuccess(updatedUser);
  } catch (error: any) {
    console.error("Mobile API Save Onboarding Profile Error:", error);
    const msg = error?.message || "Internal server error";
    const isValidationError =
      msg.includes("18 or over") ||
      msg.includes("date of birth") ||
      msg.includes("first and last name");
    return apiError(msg, isValidationError ? 400 : 500);
  }
}
