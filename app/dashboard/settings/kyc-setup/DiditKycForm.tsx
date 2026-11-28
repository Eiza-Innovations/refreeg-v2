"use client";

import Image from "next/image";
import Link from "next/link";
import { Lock, Shield } from "lucide-react";
import { Heading, P, Small } from "@/components/marketing/Typography";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FieldError } from "@/components/ui/field-error";
import { useDiditSession } from "@/hooks/use-didit-session";
import type { DiditKycFormProps } from "@/types/kyc-types";
import { diditChecklistSteps } from "../kyc/kyc-status-meta";

export default function DiditKycForm({
  userId,
  rejectedNote,
  kycFetchError,
}: DiditKycFormProps) {
  const { startVerification, isPending, errorMessage } = useDiditSession();

  return (
    <Card
      variant="surface"
      className="mx-auto max-w-2xl overflow-hidden rounded-2xl shadow-none"
      data-userid={userId}
    >
      <div className="flex flex-col items-center gap-6 border-b border-hairline bg-bone/60 p-6 sm:flex-row">
        <Image
          src="/images/kyc-guide.png"
          alt="RefreeG identity verification guide"
          width={160}
          height={160}
          className="h-32 w-32 shrink-0 rounded-2xl object-contain"
          priority
        />
        <div className="text-center sm:text-left">
          <Eyebrow>Didit automated check</Eyebrow>
          <Heading as="h1" size="panel" className="mt-1 font-semibold">
            RefreeG identity verification
          </Heading>
          <P className="mt-1.5 text-sm text-ink/60">
            Complete verification in under 2 minutes with a valid government ID
            and a clear camera.
          </P>
        </div>
      </div>

      <CardContent className="space-y-6 p-6">
        {kycFetchError && (
          <CalloutBanner
            variant="rust"
            title="Could not check existing status"
            description={kycFetchError}
          />
        )}

        {rejectedNote && (
          <CalloutBanner
            variant="rust"
            title="What to fix before retrying"
            description={rejectedNote}
          />
        )}

        <div className="rounded-xl border border-hairline bg-bone/70 p-5">
          <Eyebrow className="text-ink/50">Before you begin</Eyebrow>
          <ul className="mt-4 space-y-4">
            {diditChecklistSteps.map((item) => (
              <li key={item.step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/10 text-xs font-semibold text-forest">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="text-xs leading-relaxed text-ink/60">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <FieldError message={errorMessage} />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ink"
            size="lg"
            onClick={() => startVerification()}
            disabled={isPending}
          >
            <Shield className="mr-2 h-4 w-4" />
            {isPending ? "Preparing session..." : "Start secure verification"}
          </Button>
          <Button asChild variant="surface" size="lg">
            <Link href="/dashboard/settings/kyc">Back</Link>
          </Button>
        </div>

        <Small className="flex items-center gap-1.5 text-ink/55">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          256-bit secure encryption · Exclusively used for regulatory identity
          compliance.
        </Small>
      </CardContent>
    </Card>
  );
}
