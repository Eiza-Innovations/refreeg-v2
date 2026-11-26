import { prisma } from "@/lib/prisma";

export async function requireKycAndProfile(
  userId: string,
): Promise<string | null> {
  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountType: true,
      fullName: true,
      profilePhoto: true,
      ownedOrganization: {
        select: { verificationStatus: true },
      },
    },
  });

  if (profile?.accountType === "organization") {
    if (!profile.ownedOrganization) {
      return "/onboarding";
    }
    const status = profile.ownedOrganization.verificationStatus;
    if (status !== "approved") {
      if (status === "pending" || status === "rejected") {
        return `/dashboard/settings/kyc?error=kyc_${status}`;
      }
      return "/dashboard/settings/kyc?error=kyc_required";
    }
    return null;
  }

  const kycVerification = await prisma.kyc_verifications.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });

  if (!kycVerification) {
    return "/dashboard/settings/kyc?error=kyc_required";
  }

  if (kycVerification.status !== "approved") {
    return `/dashboard/settings/kyc?error=kyc_${kycVerification.status}`;
  }

  const hasFullName = !!(profile?.fullName && profile.fullName.trim() !== "");
  const hasPhoto = !!profile?.profilePhoto;

  if (!hasFullName || !hasPhoto) {
    return "/dashboard/settings/profile?error=profile_incomplete";
  }

  return null;
}
