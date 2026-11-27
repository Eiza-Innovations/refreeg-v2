"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import NavigationLoader from "@/components/layout/NavigationLoader";
import { Heading, P } from "@/components/marketing/Typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { KycSetupClientProps } from "@/types/kyc-types";
import { kycStatusMeta } from "../kyc/kyc-status-meta";

const DiditKycForm = dynamic(() => import("./DiditKycForm"), {
  loading: () => <NavigationLoader />,
  ssr: false,
});

export default function KycSetupClient(props: KycSetupClientProps) {
  const router = useRouter();
  const status = props.currentKyc?.status;

  useEffect(() => {
    if (status !== "pending") return;
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [status, router]);

  if (status === "pending" || status === "approved") {
    const isApproved = status === "approved";
    const meta = kycStatusMeta[status];
    const StatusIcon = isApproved ? CheckCircle2 : Clock;

    return (
      <Card
        variant="surface"
        className="mx-auto max-w-xl overflow-hidden rounded-2xl shadow-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline bg-bone/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-hairline bg-surface p-2.5">
              <StatusIcon className="h-6 w-6 text-forest" />
            </div>
            <div>
              <Eyebrow>Verification status</Eyebrow>
              <Heading as="h1" size="card" className="mt-0.5 font-semibold">
                {meta.callout.title}
              </Heading>
            </div>
          </div>
          <Badge variant={meta.badge.variant}>{meta.badge.label}</Badge>
        </div>

        <CardContent className="space-y-5 p-6">
          <CalloutBanner
            variant={meta.callout.variant}
            title={meta.callout.title}
            description={meta.callout.description}
          />
          <P className="text-sm text-ink/60">
            {isApproved
              ? "You can now create campaigns, petitions, wishlists, and receive payouts."
              : "This page checks automatically every few seconds while Didit completes your review."}
          </P>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="ink">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            <Button asChild variant="surface">
              <Link href="/dashboard/settings/kyc">View verification</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const rejectedNote =
    props.rejectedKyc?.verification_notes ??
    (status === "resubmitted"
      ? props.currentKyc?.verification_notes
      : undefined);

  return (
    <div data-testid="kyc-setup-container" data-userid={props.userId}>
      <DiditKycForm
        userId={props.userId}
        rejectedNote={rejectedNote}
        kycFetchError={props.kycFetchError}
      />
    </div>
  );
}
