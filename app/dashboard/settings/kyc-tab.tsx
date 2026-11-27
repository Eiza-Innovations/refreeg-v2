"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  Shield,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading, P, Small } from "@/components/marketing/Typography";
import type { KycStatus, KycTabProps } from "@/types/kyc-types";
import { KycLegacyDetailsCard } from "./kyc/kyc-legacy-details-card";
import { kycBenefits, kycStatusMeta } from "./kyc/kyc-status-meta";

const STATUS_ICONS: Record<KycStatus, typeof Shield> = {
  approved: CheckCircle2,
  rejected: XCircle,
  resubmitted: AlertCircle,
  pending: Clock,
  in_progress: Clock,
};

const BENEFIT_ICONS = {
  trust: ShieldCheck,
  access: CheckCircle2,
  speed: Clock,
} as const;

export function KycTab({ profile, initialKyc, initialError }: KycTabProps) {
  const eyebrowLabel =
    profile.account_type === "organization"
      ? "Organisation verification"
      : "Account verification";

  const statusMeta = initialKyc
    ? kycStatusMeta[initialKyc.status] ?? kycStatusMeta.pending
    : null;
  const StatusIcon = initialKyc
    ? STATUS_ICONS[initialKyc.status] ?? Shield
    : Shield;

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>{eyebrowLabel}</Eyebrow>
        <Heading as="h1" size="subsection" className="mt-1 font-semibold">Verification</Heading>
        <P className="mt-2 max-w-xl text-sm text-ink/60">
          Verify your identity to launch campaigns, petitions, wishlists, and receive payouts.
        </P>
      </div>

      {initialError && (
        <CalloutBanner
          variant="rust"
          title="Couldn't load verification status"
          description={initialError}
        />
      )}

      {!initialKyc ? (
        <div className="space-y-6">
          <Card variant="surface" className="overflow-hidden rounded-2xl shadow-none">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
              <CardContent className="flex flex-col justify-center p-6 sm:p-8">
                <div><Badge variant="held">Not verified</Badge></div>
                <Heading as="h2" size="panel" className="mt-3 font-semibold text-ink">
                  Verify your identity in under 2 minutes
                </Heading>
                <P className="mt-2 max-w-lg text-sm leading-relaxed text-ink/65">
                  Identity verification keeps the RefreeG community trusted. Once approved, you can launch causes, create petitions, build wishlists, and withdraw raised funds.
                </P>
                <div className="mt-6">
                  <Button asChild variant="ink" size="lg">
                    <Link href="/dashboard/settings/kyc-setup">
                      <Shield className="mr-2 h-4 w-4" />
                      Start verification
                    </Link>
                  </Button>
                </div>
                <Small className="mt-3 flex items-center gap-1.5 text-ink/55">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  Encrypted biometric &amp; document check powered by Didit.
                </Small>
              </CardContent>

              <div className="flex items-center justify-center border-t border-hairline bg-bone/70 p-6 lg:border-l lg:border-t-0">
                <Image
                  src="/images/kyc-guide.png"
                  alt="RefreeG identity verification guide"
                  width={220}
                  height={220}
                  className="h-44 w-44 rounded-2xl object-contain"
                  priority
                />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {kycBenefits.map((benefit) => {
              const Icon = BENEFIT_ICONS[benefit.key];
              return (
                <Card key={benefit.key} variant="surface" className="rounded-2xl shadow-none">
                  <CardContent className="p-5">
                    <Icon className="h-5 w-5 text-forest" />
                    <h3 className="mt-3 text-sm font-semibold text-ink">{benefit.title}</h3>
                    <P className="mt-1 text-xs leading-relaxed text-ink/60">{benefit.description}</P>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card variant="surface" className="overflow-hidden rounded-2xl shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline bg-bone/50 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-hairline bg-surface p-2.5">
                <StatusIcon className="h-6 w-6 text-forest" />
              </div>
              <div>
                <Heading as="h2" size="card" className="font-semibold">Identity verification</Heading>
                <P className="mt-0.5 text-sm text-ink/60">{statusMeta?.summary}</P>
              </div>
            </div>
            {statusMeta && <Badge variant={statusMeta.badge.variant}>{statusMeta.badge.label}</Badge>}
          </div>

          <CardContent className="space-y-4 p-6">
            {statusMeta && (
              <CalloutBanner
                variant={statusMeta.callout.variant}
                title={statusMeta.callout.title}
                description={statusMeta.callout.description}
              />
            )}

            {(initialKyc.status === "rejected" || initialKyc.status === "resubmitted") &&
              initialKyc.verification_notes && (
                <CalloutBanner
                  variant={initialKyc.status === "rejected" ? "rust" : "gold"}
                  title={initialKyc.status === "rejected" ? "Why it wasn't approved" : "What to update"}
                  description={initialKyc.verification_notes}
                />
              )}

            {statusMeta?.ctaLabel && (
              <div>
                <Button asChild variant="ink">
                  <Link href="/dashboard/settings/kyc-setup">
                    <Shield className="mr-2 h-4 w-4" />
                    {statusMeta.ctaLabel}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {initialKyc && initialKyc.document_type !== "didit" && (
        <KycLegacyDetailsCard kycData={initialKyc} />
      )}
    </div>
  );
}
