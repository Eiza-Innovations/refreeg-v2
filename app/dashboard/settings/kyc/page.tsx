import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getCachedProfile } from "@/lib/profile-cache";
import { getOrganizationVerification } from "@/actions/users/organization-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsShell } from "../components/settings-shell";
import { KycSettingsContent } from "./kyc-settings-content";

export default async function KycSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const profile = await getCachedProfile(session.user.id).catch(() => null);
  const orgVerification =
    profile?.account_type === "organization"
      ? await getOrganizationVerification()
      : null;

  return (
    <Suspense
      fallback={
        <SettingsShell isVerified={profile?.is_verified}>
          <Skeleton className="h-[400px] w-full" />
        </SettingsShell>
      }
    >
      <KycSettingsContent
        profile={profile}
        user={{ id: session.user.id, email: session.user.email ?? "" }}
        orgVerification={orgVerification}
      />
    </Suspense>
  );
}
