"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getOrganizationOnboardingSummary } from "@/actions/users/organization-actions";
import type { OrganizationOnboardingSummary } from "@/types/organization-types";
import type { ChecklistStepProps } from "@/types/onboarding-types";
import { onboardingSplitClass } from "@/components/onboarding/split-layout";

function RowCircle({ done, index }: { done: boolean; index: number }) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        done ? "bg-forest text-white" : "bg-cream-muted text-ink/60",
      )}
    >
      {done ? <Check className="h-4 w-4" /> : index}
    </span>
  );
}

export default function ChecklistStep({
  user,
  onComplete,
}: ChecklistStepProps) {
  const router = useRouter();
  const {
    data: summary,
    isLoading,
    error,
  } = useQuery<OrganizationOnboardingSummary>({
    queryKey: ["organization-onboarding-summary", user.id],
    queryFn: async () => {
      const result = await getOrganizationOnboardingSummary();
      if (!result.success || !result.summary) {
        throw new Error(result.error || "Unable to load organisation.");
      }
      return result.summary;
    },
  });

  if (isLoading) {
    return (
      <div className={onboardingSplitClass}>
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <p className="text-sm text-rust">
        {error instanceof Error
          ? error.message
          : "Unable to load your organisation. Please refresh and try again."}
      </p>
    );
  }

  const csrDone = summary.purpose === "fundraising" || !!summary.csrBudget;
  const verified = summary.verificationStatus === "approved";
  const pending = summary.verificationStatus === "pending";
  const rejected = summary.verificationStatus === "rejected";

  const inviteWord = summary.inviteCount === 1 ? "invite" : "invites";
  const budgetLine =
    summary.purpose === "fundraising"
      ? "Team workspace ready"
      : summary.csrBudget
        ? `₦${summary.csrBudget.toLocaleString()} a year · ${summary.inviteCount} ${inviteWord} sent`
        : `CSR budget pending · ${summary.inviteCount} ${inviteWord} sent`;

  const title = summary.name
    ? `${summary.name} is set up`
    : "Your organisation is set up";

  return (
    <div className={onboardingSplitClass}>
      <div className="flex flex-col">
        <h1 className="font-fraunces text-4xl font-medium text-ink sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-ink/70">
          Your organisation account is ready to browse. Verifying your
          organisation is the next step.
        </p>
        <div className="mt-8 lg:mt-auto lg:pt-8">
          <Button
            type="button"
            variant="ink"
            onClick={() => onComplete()}
            className="h-12 px-10"
          >
            Go to dashboard
          </Button>
        </div>
      </div>

      <Card variant="surface" className="divide-y divide-hairline">
        <div className="flex items-center gap-4 p-5 sm:p-6">
          <RowCircle done index={1} />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink">
              Organisation details
            </p>
            <p className="mt-0.5 truncate text-sm text-ink/60">
              {[
                summary.name,
                summary.registrationNumber,
                summary.ownerHandle ? `@${summary.ownerHandle}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 sm:p-6">
          <RowCircle done={csrDone} index={2} />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink">
              CSR budget and team
            </p>
            <p className="mt-0.5 truncate text-sm text-ink/60">{budgetLine}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 p-5 sm:flex-nowrap sm:p-6">
          <RowCircle done={verified} index={3} />
          <div className="min-w-0 flex-1 basis-40">
            <p className="text-base font-semibold text-ink">
              Verify your organisation
            </p>
            <p className="mt-0.5 text-sm text-ink/60">
              Upload CAC documents and director IDs. Takes about 2 working days.
            </p>
            {rejected ? (
              <Badge variant="critical" className="mt-2">
                Rejected, please resubmit
              </Badge>
            ) : null}
            {pending ? (
              <Badge variant="pending" className="mt-2">
                In review
              </Badge>
            ) : null}
          </div>
          {verified ? (
            <Badge variant="verified">Verified</Badge>
          ) : pending ? null : (
            <Button
              type="button"
              variant="ink"
              onClick={() => router.push("/organization/verification")}
              className="ml-[3.25rem] shrink-0 sm:ml-0"
            >
              Start verification
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
