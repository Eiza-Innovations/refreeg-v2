import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getProfile } from "@/actions/users/profile-actions";
import { updateProfileCore } from "@/lib/users/profile-core";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
import type { ProfileFormData } from "@/types";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const profile = await getProfile(user!.id);

    if (!profile) {
      return apiError("Profile not found", 404);
    }

    return apiSuccess(profile);
  } catch (error: any) {
    console.error("Mobile API Get Profile Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();

    if (
      body.profile_photo !== undefined &&
      body.profile_photo !== null &&
      body.profile_photo !== "" &&
      !isOwnUploadKey(body.profile_photo, "profiles", user!.id)
    ) {
      return apiError("Invalid profile photo upload key", 400);
    }

    const profileData: Partial<ProfileFormData> = {};
    const resolvedName =
      body.full_name !== undefined ? body.full_name : body.name;
    if (resolvedName !== undefined) profileData.name = resolvedName;
    if (body.username !== undefined) profileData.username = body.username;
    if (body.phone !== undefined) profileData.phone = body.phone;
    if (body.bio !== undefined) profileData.bio = body.bio;
    if (body.location !== undefined) profileData.location = body.location;
    if (body.display_name !== undefined) {
      profileData.display_name = body.display_name;
    }
    if (body.donation_preference !== undefined) {
      profileData.donation_preference = body.donation_preference;
    }
    if (body.profile_photo !== undefined) {
      profileData.profile_photo = body.profile_photo || null;
    }
    if (body.twitter_url !== undefined) {
      profileData.twitter_url = body.twitter_url;
    }
    if (body.facebook_url !== undefined) {
      profileData.facebook_url = body.facebook_url;
    }
    if (body.instagram_url !== undefined) {
      profileData.instagram_url = body.instagram_url;
    }
    if (body.linkedin_url !== undefined) {
      profileData.linkedin_url = body.linkedin_url;
    }

    const updatedProfile = await updateProfileCore(
      user!.id,
      profileData as ProfileFormData,
    );

    return apiSuccess(updatedProfile);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return apiError("Username is already taken", 409);
    }
    console.error("Mobile API Update Profile Error:", error);
    return apiError("Internal server error", 500);
  }
}
