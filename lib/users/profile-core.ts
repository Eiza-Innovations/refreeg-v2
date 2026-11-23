// Profile and onboarding mutation core. Deliberately NOT a "use server" module:
// actions/users/profile-actions.ts enforces cookie session ownership (assertSelf)
// and Next cache revalidation, while mobile API routes authenticate via Bearer JWT
// and invoke these functions directly without NextAuth cookie sessions.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
import { extractS3Key } from "@/lib/s3/s3-utils";
import { validateUpload } from "@/lib/s3/upload-policy";
import {
  fetchBreetBanks,
  resolveBreetBankId,
  validateBreetBankAccount,
} from "@/lib/payments/breet";
import type {
  Profile,
  ProfileFormData,
  BankDetailsFormData,
  OnboardingProfileData,
} from "@/types";

const ALLOWED_ONBOARDING_ACCOUNT_TYPES = new Set([
  "individual",
  "creator",
  "non-profit",
  "organization",
  "community",
  "developer",
]);

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

const ONBOARDING_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  firstName: true,
  lastName: true,
  displayName: true,
  username: true,
  bio: true,
  phone: true,
  location: true,
  profilePhoto: true,
  accountType: true,
  gender: true,
  onboarding_completed: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type OnboardingProfileResult = Prisma.UserGetPayload<{
  select: typeof ONBOARDING_USER_SELECT;
}>;

export class OnboardingValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "OnboardingValidationError";
    this.statusCode = statusCode;
  }
}

export function isAllowedOAuthAvatarUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.port
    ) {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return (
      /^lh[3-6]\.googleusercontent\.com$/.test(host) ||
      host === "graph.facebook.com" ||
      host === "avatars.githubusercontent.com"
    );
  } catch {
    return false;
  }
}

export function resolveAllowedAvatarRef(
  value: string,
  userId: string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (isOwnUploadKey(trimmed, "profiles", userId)) {
    return trimmed;
  }

  const s3Key = extractS3Key(trimmed);
  if (s3Key && isOwnUploadKey(s3Key, "profiles", userId)) {
    return s3Key;
  }

  if (isAllowedOAuthAvatarUrl(trimmed)) {
    return trimmed;
  }

  return null;
}

export function mapPrismaToProfile(p: any): Profile {
  return {
    id: p.id,
    email: p.email,
    full_name: p.fullName,
    first_name: p.firstName,
    last_name: p.lastName,
    username: p.username,
    display_name: p.displayName ?? null,
    phone: p.phone,
    location: p.location,
    donation_preference: p.donationPreference ?? "named",
    account_number: p.accountNumber,
    bank_name: p.bankName,
    account_name: p.accountName,
    sub_account_code: p.subAccountCode,
    flutterwave_sub_account_id: p.flutterwaveSubAccountId || null,
    profile_photo: p.profilePhoto,
    is_blocked: p.isBlocked ?? false,
    referral_code: p.referralCode || null,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt?.toISOString() || new Date().toISOString(),
    account_type: p.accountType as any,
    is_verified: p.isVerified ?? false,
    total_points: p.total_points ?? 0,
    interests: p.interests ?? [],
    gender: p.gender,
    bio: p.bio,
    twitter_url: p.twitter_url,
    facebook_url: p.facebook_url,
    instagram_url: p.instagram_url,
    linkedin_url: p.linkedin_url,
    crypto_wallets: p.crypto_wallets ?? null,
  } as Profile;
}

export async function updateProfileCore(
  userId: string,
  profileData: ProfileFormData,
): Promise<Profile> {
  try {
    if (profileData.account_type === "organization") {
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { accountType: true },
      });
      if (existing?.accountType === "individual") {
        throw new Error(
          "Individual accounts cannot be converted to organization accounts.",
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (profileData.name !== undefined) updateData.fullName = profileData.name;
    if (profileData.username !== undefined) {
      updateData.username = profileData.username;
    }
    if (profileData.phone !== undefined) {
      updateData.phone = profileData.phone || null;
    }
    if (profileData.bio !== undefined) updateData.bio = profileData.bio;
    if (profileData.location !== undefined) {
      updateData.location = profileData.location || null;
    }
    if (profileData.display_name !== undefined) {
      updateData.displayName = profileData.display_name || null;
    }
    if (profileData.donation_preference !== undefined) {
      updateData.donationPreference =
        profileData.donation_preference || "named";
    }
    if (profileData.interests !== undefined) {
      updateData.interests = profileData.interests;
    }
    if (profileData.account_type !== undefined) {
      updateData.accountType = profileData.account_type;
    }
    if (profileData.profile_photo !== undefined) {
      updateData.profilePhoto = profileData.profile_photo;
    }
    if (profileData.twitter_url !== undefined) {
      updateData.twitter_url = profileData.twitter_url || null;
    }
    if (profileData.facebook_url !== undefined) {
      updateData.facebook_url = profileData.facebook_url || null;
    }
    if (profileData.instagram_url !== undefined) {
      updateData.instagram_url = profileData.instagram_url || null;
    }
    if (profileData.linkedin_url !== undefined) {
      updateData.linkedin_url = profileData.linkedin_url || null;
    }

    const data = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return mapPrismaToProfile(data);
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
}

export async function updateBankDetailsCore(
  userId: string,
  bankData: BankDetailsFormData,
): Promise<Profile> {
  // When the Breet settlement integration is configured, verify the account
  // against its bank list so crypto auto-settlement is pointed at a real
  // account. Only a definitive rejection blocks the save; provider outages
  // and unsupported banks stay fail-open.
  if (
    process.env.BREET_APP_ID &&
    process.env.BREET_APP_SECRET &&
    bankData.accountNumber &&
    bankData.bankName
  ) {
    const banks = await fetchBreetBanks().catch(() => []);
    const breetBankId = resolveBreetBankId(bankData.bankName, banks);
    if (breetBankId) {
      const validation = await validateBreetBankAccount(
        breetBankId,
        bankData.accountNumber,
      );
      if (validation.status === "invalid") {
        throw new Error(
          "We could not verify this bank account with our settlement provider. Please double-check the bank and account number.",
        );
      }
    }
  }

  try {
    const data = await prisma.user.update({
      where: { id: userId },
      data: {
        accountNumber: bankData.accountNumber,
        bankName: bankData.bankName,
        accountName: bankData.accountName,
        subAccountCode: bankData.sub_account_code,
        ...(bankData.flutterwave_sub_account_id
          ? { flutterwaveSubAccountId: bankData.flutterwave_sub_account_id }
          : {}),
      },
    });

    return mapPrismaToProfile(data);
  } catch (error) {
    console.error("Error updating bank details:", error);
    throw error;
  }
}

export async function createOnboardingProfileCore(
  userId: string,
  profileData: OnboardingProfileData,
  oauthAvatarUrl?: string | null,
): Promise<OnboardingProfileResult> {
  const existingProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: { profilePhoto: true, accountType: true },
  });

  let profilePhotoUrl: string | null = existingProfile?.profilePhoto ?? null;

  if (typeof profileData.profilePhoto === "string") {
    const trimmedKey = profileData.profilePhoto.trim();
    if (trimmedKey) {
      if (!isOwnUploadKey(trimmedKey, "profiles", userId)) {
        throw new OnboardingValidationError(
          "Invalid profile photo upload key",
          400,
        );
      }
      profilePhotoUrl = trimmedKey;
    }
  } else if (profileData.profilePhoto) {
    if (typeof profileData.profilePhoto.arrayBuffer !== "function") {
      throw new OnboardingValidationError("Invalid profile photo file", 400);
    }
    const uploadError = validateUpload({
      entityType: "profiles",
      mediaType: "images",
      contentType: profileData.profilePhoto.type,
      size: profileData.profilePhoto.size,
    });
    if (uploadError) {
      throw new OnboardingValidationError(uploadError, 400);
    }

    const ext = profileData.profilePhoto.name.split(".").pop() || "jpg";
    const uniqueId = Math.random().toString(36).substring(2, 15);
    try {
      const { uploadToS3, generateS3Key } = await import("@/lib/s3/s3-utils");
      const s3Key = generateS3Key({
        entityType: "profiles",
        userId,
        entityId: userId,
        mediaType: "images",
        filename: `${uniqueId}.${ext}`,
      });
      const buffer = Buffer.from(await profileData.profilePhoto.arrayBuffer());
      await uploadToS3(buffer, s3Key, profileData.profilePhoto.type);
      profilePhotoUrl = s3Key;
    } catch (uploadError) {
      console.error("Error uploading profile photo:", uploadError);
      throw new Error("Failed to upload profile photo");
    }
  }

  if (
    !profilePhotoUrl &&
    typeof oauthAvatarUrl === "string" &&
    oauthAvatarUrl.trim()
  ) {
    const resolvedAvatar = resolveAllowedAvatarRef(oauthAvatarUrl, userId);
    if (!resolvedAvatar) {
      throw new OnboardingValidationError("Invalid OAuth avatar URL", 400);
    }
    profilePhotoUrl = resolvedAvatar;
  }

  const fullName = `${profileData.firstName ?? ""} ${
    profileData.lastName ?? ""
  }`.trim();

  const updateData: Prisma.UserUpdateInput = {
    // The wizard is completed explicitly on its final screen. Keeping this
    // false here prevents the onboarding guard from skipping KYC and success.
    onboarding_completed: false,
  };

  if (profileData.phone) updateData.phone = profileData.phone;
  if (fullName) updateData.fullName = fullName;
  if (profilePhotoUrl) updateData.profilePhoto = profilePhotoUrl;

  if (profileData.firstName) updateData.firstName = profileData.firstName;
  if (profileData.lastName) updateData.lastName = profileData.lastName;

  if (typeof profileData.username === "string" && profileData.username.trim()) {
    const normalizedUsername = profileData.username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      throw new OnboardingValidationError(
        "Username must be 3-30 characters using only letters, numbers, and underscores.",
        400,
      );
    }
    updateData.username = normalizedUsername;
  }

  if (profileData.location) updateData.location = profileData.location;

  const trimmedBio =
    typeof profileData.bio === "string" ? profileData.bio.trim() : "";
  if (trimmedBio) updateData.bio = trimmedBio.slice(0, 500);

  const trimmedDisplayName =
    typeof profileData.displayName === "string"
      ? profileData.displayName.trim()
      : "";
  if (trimmedDisplayName) {
    updateData.displayName = trimmedDisplayName.slice(0, 100);
  }

  if (existingProfile?.accountType === "organization") {
    updateData.accountType = "organization";
  } else if (existingProfile?.accountType === "individual") {
    updateData.accountType = "individual";
  } else if (profileData.accountType) {
    if (!ALLOWED_ONBOARDING_ACCOUNT_TYPES.has(profileData.accountType)) {
      throw new OnboardingValidationError("Invalid accountType", 400);
    }
    updateData.accountType = profileData.accountType;
  }

  if (profileData.gender) updateData.gender = profileData.gender;

  try {
    return await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: ONBOARDING_USER_SELECT,
    });
  } catch (error) {
    if (error instanceof OnboardingValidationError) {
      throw error;
    }
    if ((error as { code?: string })?.code === "P2002") {
      throw new OnboardingValidationError(
        "This username is already taken. Please choose another.",
        409,
      );
    }
    console.error("Error creating/updating profile:", error);
    throw new Error("Failed to create profile");
  }
}

export async function saveStep1ProgressCore(
  userId: string,
  accountType: string,
): Promise<void> {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true },
    });

    if (
      existing?.accountType === "individual" &&
      accountType === "organization"
    ) {
      throw new Error(
        "Individual accounts cannot be converted to organization accounts.",
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        accountType:
          existing?.accountType === "organization"
            ? "organization"
            : accountType,
      },
    });
  } catch (error) {
    console.error("Error in saveStep1Progress:", error);
    throw error;
  }
}

export async function saveStep2ProgressCore(
  userId: string,
  gender: string,
): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        gender: gender,
      },
    });
  } catch (error) {
    console.error("Error in saveStep2Progress:", error);
    throw error;
  }
}

export async function completeOnboardingCore(userId: string): Promise<void> {
  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountType: true,
      firstName: true,
      lastName: true,
      username: true,
      location: true,
      phone: true,
    },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  const missingFields = [
    !profile.accountType && "account type",
    !profile.firstName && "first name",
    !profile.lastName && "last name",
    !profile.username && "username",
    !profile.location && "location",
    !profile.phone && "phone number",
  ].filter(Boolean);

  if (missingFields.length > 0) {
    throw new Error(`Complete ${missingFields.join(", ")} before continuing`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { onboarding_completed: true },
  });
}
