"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import type { KycSettingsContentProps } from "@/types/kyc-types";
import { SettingsShell } from "../components/settings-shell";
import { KycTab } from "../kyc-tab";

export function KycSettingsContent({
  profile,
  initialKyc,
  initialError,
}: KycSettingsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (hasShownToast.current) return;

    const kycStatus = initialKyc?.status;
    const errorParam = searchParams.get("error");

    if (errorParam === "kyc_required") {
      hasShownToast.current = true;
      toast({
        title: "Verification required",
        description:
          "Complete your verification to list causes and access all features.",
        variant: "destructive",
        action: (
          <ToastAction
            altText="Start verification"
            onClick={() => router.push("/dashboard/settings/kyc-setup")}
          >
            Start verification
          </ToastAction>
        ),
      });
    } else if (kycStatus === "pending" || errorParam === "kyc_pending") {
      hasShownToast.current = true;
      toast({
        title: "Verification under review",
        description:
          "Your verification submission is pending review. We'll email you once approved.",
        variant: "default",
      });
    } else if (kycStatus === "rejected" || errorParam === "kyc_rejected") {
      hasShownToast.current = true;
      toast({
        title: "Verification not approved",
        description:
          "Your verification was not approved. Review the notes and try again.",
        variant: "destructive",
        action: (
          <ToastAction
            altText="Resubmit verification"
            onClick={() => router.push("/dashboard/settings/kyc-setup")}
          >
            Resubmit
          </ToastAction>
        ),
      });
    }
  }, [initialKyc?.status, searchParams, router]);

  if (!profile) {
    return (
      <SettingsShell>
        <CalloutBanner
          variant="rust"
          title="Couldn't load your profile"
          description="Refresh the page to try again."
        />
      </SettingsShell>
    );
  }

  return (
    <SettingsShell
      isOrganization={profile.account_type === "organization"}
      isVerified={profile.is_verified}
    >
      <KycTab
        profile={profile}
        initialKyc={initialKyc}
        initialError={initialError}
      />
    </SettingsShell>
  );
}
