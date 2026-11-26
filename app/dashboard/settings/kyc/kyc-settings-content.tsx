"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { KycTab } from "../kyc-tab";
import { SettingsShell } from "../components/settings-shell";
import { VerificationForm } from "@/app/organization/verification/verification-form";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Card, CardContent } from "@/components/ui/card";
import { Heading, P } from "@/components/marketing/Typography";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getVerificationStatus } from "@/actions/users/kyc-actions";
import type { Profile } from "@/types";

interface OrgVerificationState {
  success: boolean;
  verificationStatus: string | null;
  submission: {
    status: string;
    note: string | null;
    submittedAt: string;
  } | null;
  error?: string;
}

interface KycSettingsContentProps {
  profile: Profile | null;
  user: { id: string; email: string };
  orgVerification?: OrgVerificationState | null;
}

export function KycSettingsContent({
  profile,
  user,
  orgVerification,
}: KycSettingsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasShownToast = useRef(false);
  const isOrganization = profile?.account_type === "organization";

  useEffect(() => {
    if (isOrganization) {
      const errorParam = searchParams.get("error");
      if (!errorParam || hasShownToast.current) return;
      hasShownToast.current = true;
      if (errorParam === "kyc_required") {
        toast({
          title: "Company Verification Required",
          description:
            "Upload your company documents and director IDs for manual review.",
          variant: "destructive",
        });
      } else if (errorParam === "kyc_pending") {
        toast({
          title: "Verification Under Review",
          description:
            "Your company documents are pending manual review (about 2 working days).",
        });
      } else if (errorParam === "kyc_rejected") {
        toast({
          title: "Verification Rejected",
          description:
            "Review the rejection note below and re-upload your documents.",
          variant: "destructive",
        });
      }
      return;
    }

    async function checkKycStatus() {
      const kycResult = await getVerificationStatus(user.id);
      const kycStatus = (kycResult?.status ?? undefined) as
        "pending" | "approved" | "rejected" | undefined;

      if (searchParams.get("error") === "kyc_required") {
        if (!hasShownToast.current) {
          hasShownToast.current = true;
          toast({
            title: "KYC Verification Required",
            description:
              "Complete your KYC verification to list causes and access all features.",
            variant: "destructive",
            action: (
              <ToastAction
                altText="Set up KYC"
                onClick={() => router.push("/dashboard/settings/kyc-setup")}
              >
                Set up KYC
              </ToastAction>
            ),
          });
        }
      } else if (
        kycStatus === "pending" ||
        searchParams.get("error") === "kyc_pending"
      ) {
        if (!hasShownToast.current) {
          hasShownToast.current = true;
          toast({
            title: "KYC Under Review",
            description:
              "Your KYC submission is pending review. You will be notified via email once it is approved.",
            variant: "default",
          });
        }
      } else if (
        kycStatus === "rejected" ||
        searchParams.get("error") === "kyc_rejected"
      ) {
        if (!hasShownToast.current) {
          hasShownToast.current = true;
          toast({
            title: "KYC Rejected",
            description:
              "Your KYC submission was rejected. Please review the requirements and resubmit.",
            variant: "destructive",
            action: (
              <ToastAction
                altText="Resubmit KYC"
                onClick={() => router.push("/dashboard/settings/kyc-setup")}
              >
                Resubmit
              </ToastAction>
            ),
          });
        }
      }
    }

    checkKycStatus();
  }, [isOrganization, user.id, searchParams, router]);

  if (!profile) {
    return (
      <SettingsShell>
        <P className="text-muted-foreground md:text-sm">
          Couldn&apos;t load your profile. Refresh the page to try again.
        </P>
      </SettingsShell>
    );
  }

  if (isOrganization) {
    const approved = orgVerification?.verificationStatus === "approved";
    return (
      <SettingsShell isVerified={profile.is_verified || approved}>
        <div>
          <Eyebrow>Organisation verification</Eyebrow>
          <Heading as="h2" size="section" className="mt-2">
            Company &amp; Director KYC
          </Heading>
          <P className="mt-2 text-ink/70 md:text-sm">
            Submit your CAC documents and director IDs for manual review and
            approval (about 2 working days).
          </P>
          {orgVerification?.success && orgVerification.verificationStatus ? (
            <VerificationForm
              verificationStatus={orgVerification.verificationStatus}
              submission={orgVerification.submission}
              redirectTo="/dashboard/settings/kyc"
            />
          ) : (
            <Card variant="surface" className="mt-6">
              <CardContent className="p-6">
                <P className="text-ink/70 md:text-sm">
                  {orgVerification?.error ||
                    "Complete your organisation setup in onboarding first."}
                </P>
              </CardContent>
            </Card>
          )}
        </div>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell isVerified={profile.is_verified}>
      <KycTab profile={profile} user={user} />
    </SettingsShell>
  );
}
