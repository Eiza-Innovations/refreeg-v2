"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Clock,
  Shield,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Heading, P } from "@/components/marketing/Typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { KycStatusCardProps } from "@/types/kyc-types";
import {
  kycPendingSteps,
  kycRetryChecklist,
  kycStatusMeta,
  kycUnlockedFeatures,
} from "./kyc-status-meta";

function formatVerifiedDate(raw?: string): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function KycStatusCard({
  kycData,
  context = "overview",
  isPolling = false,
}: KycStatusCardProps) {
  const status = kycData.status;

  if (status === "approved") {
    const verifiedDate = formatVerifiedDate(kycData.updated_at);
    return (
      <Card
        variant="surface"
        className="overflow-hidden rounded-2xl shadow-none"
      >
        <div className="flex items-center justify-between gap-6 bg-forest px-6 py-7 text-forest-foreground sm:px-8">
          <div>
            <Badge variant="cleared">Verified</Badge>
            <Heading
              as="h2"
              size="panel"
              className="mt-3 font-semibold text-white"
            >
              Your identity is verified
            </Heading>
            <P className="mt-1.5 max-w-lg text-sm text-white/80">
              Your account is trusted across RefreeG and every creator feature
              is active.
            </P>
            {verifiedDate && (
              <p className="mt-3 text-xs text-white/65">
                Verified on {verifiedDate}
              </p>
            )}
          </div>
          <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 sm:flex">
            <ShieldCheck className="h-8 w-8 text-lime" />
          </div>
        </div>

        <CardContent className="space-y-5 p-6">
          <Eyebrow className="text-ink/50">Unlocked on your account</Eyebrow>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {kycUnlockedFeatures.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-xl border border-hairline bg-bone/70 p-3.5"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                <div>
                  <p className="text-sm font-medium text-ink">
                    {feature.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink/60">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="ink">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            {context === "setup" && (
              <Button asChild variant="surface">
                <Link href="/dashboard/settings/kyc">Back to verification</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "pending") {
    return (
      <Card
        variant="surface"
        className="overflow-hidden rounded-2xl shadow-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gold/40 bg-gold/15 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-gold/40 bg-surface p-2.5 text-amber">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <Eyebrow>Under review</Eyebrow>
              <Heading as="h2" size="card" className="mt-0.5 font-semibold">
                Reviewing your verification
              </Heading>
            </div>
          </div>
          <Badge variant="pending">Pending review</Badge>
        </div>

        <CardContent className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {kycPendingSteps.map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-3 rounded-xl border border-hairline bg-bone/70 p-3.5"
              >
                <span
                  className={
                    item.state === "done"
                      ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest text-white"
                      : item.state === "active"
                        ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-ink"
                        : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-xs font-semibold text-ink/45"
                  }
                >
                  {item.state === "done" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : item.state === "active" ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : (
                    item.step
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  <p className="mt-0.5 text-xs text-ink/60">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <CalloutBanner
            variant="gold"
            title="Typical wait: 2–5 minutes (up to 24 hours)"
            description={
              isPolling
                ? "Checking automatically every few seconds. You can safely leave this page — we'll email you once approved."
                : "You don't need to keep this tab open. We'll email you as soon as Didit finishes reviewing your submission."
            }
          />

          {context === "setup" && (
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="surface">
                <Link href="/dashboard">Return to dashboard</Link>
              </Button>
              <Button asChild variant="subtle">
                <Link href="/dashboard/settings/kyc">Back to verification</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (status === "rejected") {
    return (
      <Card
        variant="surface"
        className="overflow-hidden rounded-2xl border-rust/30 shadow-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rust/20 bg-rust/[0.06] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-rust/25 bg-surface p-2.5 text-rust">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <Eyebrow className="text-rust">Not approved</Eyebrow>
              <Heading as="h2" size="card" className="mt-0.5 font-semibold">
                Verification wasn&apos;t approved
              </Heading>
            </div>
          </div>
          <Badge variant="critical">Rejected</Badge>
        </div>

        <CardContent className="space-y-5 p-6">
          <CalloutBanner
            variant="rust"
            title="Why it wasn't approved"
            description={
              kycData.verification_notes ||
              "Your document or selfie couldn't be verified clearly. Review the tips below and try again."
            }
          />
          <div className="space-y-2 rounded-xl border border-hairline bg-bone/70 p-4">
            <Eyebrow className="text-ink/50">Before you resubmit</Eyebrow>
            <ul className="space-y-1.5 text-xs text-ink/75">
              {kycRetryChecklist.map((tip) => (
                <li key={tip} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-forest" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
          <Button asChild variant="ink" size="lg">
            <Link href="/dashboard/settings/kyc-setup">
              <Shield className="mr-2 h-4 w-4" />
              Fix &amp; resubmit verification
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const meta = kycStatusMeta[status] ?? kycStatusMeta.in_progress;

  return (
    <Card variant="outlined" className="overflow-hidden rounded-2xl">
      <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <Badge variant={meta.badge.variant}>{meta.badge.label}</Badge>
          <Heading as="h2" size="panel" className="font-semibold">
            {meta.callout.title}
          </Heading>
          <P className="max-w-lg text-sm text-ink/65">
            {meta.callout.description}
          </P>
          {kycData.verification_notes && (
            <CalloutBanner
              variant="gold"
              title="What to update"
              description={kycData.verification_notes}
            />
          )}
          <div className="pt-1">
            <Button asChild variant="ink" size="lg">
              <Link href="/dashboard/settings/kyc-setup">
                <Shield className="mr-2 h-4 w-4" />
                Resume verification
              </Link>
            </Button>
          </div>
        </div>
        <div className="hidden shrink-0 rounded-2xl border border-hairline bg-surface p-3 sm:block">
          <Image
            src="/images/kyc-guide.png"
            alt="RefreeG identity verification guide"
            width={112}
            height={112}
            className="h-24 w-24 rounded-xl object-contain"
          />
        </div>
      </CardContent>
    </Card>
  );
}
