import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getVerificationStatus } from "@/actions/users/kyc-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth/auth";
import { getCachedProfile } from "@/lib/profile-cache";
import { SettingsShell } from "../components/settings-shell";
import { KycSettingsContent } from "./kyc-settings-content";

export default async function KycSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [profile, kycResult] = await Promise.all([
    getCachedProfile(session.user.id).catch(() => null),
    getVerificationStatus(session.user.id),
  ]);

  return (
    <Suspense
      fallback={
        <SettingsShell
          isOrganization={profile?.account_type === "organization"}
          isVerified={profile?.is_verified}
        >
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </SettingsShell>
      }
    >
      <KycSettingsContent
        profile={profile}
        userId={session.user.id}
        initialKyc={kycResult.status}
        initialError={kycResult.error}
      />
    </Suspense>
  );
}
