import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/users/auth-actions";
import { getVerificationStatus } from "@/actions/users/kyc-actions";
import { getCachedProfile } from "@/lib/profile-cache";
import { SettingsShell } from "../components/settings-shell";
import KycSetupClient from "./KycSetupClient";

export default async function KycSetupPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  const [profile, { status, error: kycError }] = await Promise.all([
    getCachedProfile(user.id).catch(() => null),
    getVerificationStatus(user.id),
  ]);

  const rejectedKyc = status?.status === "rejected" ? status : null;

  return (
    <SettingsShell
      isOrganization={profile?.account_type === "organization"}
      isVerified={profile?.is_verified}
    >
      <KycSetupClient
        userId={user.id}
        rejectedKyc={rejectedKyc}
        kycFetchError={kycError}
        currentKyc={status}
      />
    </SettingsShell>
  );
}
