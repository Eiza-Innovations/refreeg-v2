"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, MessageSquareWarning } from "lucide-react";
import { BountyStatusBadge } from "@/components/bounties/BountyStatusBadge";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useValidator } from "@/hooks/use-validator";
import { bountyChangeRequestSchema } from "@/lib/schemas/bounty.schema";
import type { Bounty } from "@/types/bounty-types";

type ReviewOutcome = "approved" | "changes-requested" | null;

export function AdminBountyDecision({ bounty }: { bounty: Bounty }) {
  const [outcome, setOutcome] = useState<ReviewOutcome>(null);
  const [form, setForm] = useState({ feedback: "" });
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: bountyChangeRequestSchema,
  });

  const setFormFields = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const requestChanges = () => {
    if (!validate()) return;
    setOutcome("changes-requested");
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="bare" size="bare" className="text-ink/60">
        <Link href="/dashboard/admin/bounties">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to review queue
        </Link>
      </Button>

      {outcome ? (
        <CalloutBanner
          variant={outcome === "approved" ? "lime" : "gold"}
          title={
            outcome === "approved"
              ? "Bounty approved and published"
              : "Changes sent to the campaign owner"
          }
          description={
            outcome === "approved"
              ? "The bounty is now live and open for applications."
              : form.feedback
          }
          icon={
            outcome === "approved" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0" />
            )
          }
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card variant="surface">
          <CardContent className="space-y-8 p-5 sm:p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <BountyStatusBadge status={bounty.status} />
                <span className="text-xs font-medium text-ink/50">
                  Submitted{" "}
                  {new Date(bounty.submittedAt).toLocaleDateString("en-NG")}
                </span>
              </div>
              <h1 className="font-fraunces text-3xl tracking-tight text-ink">
                {bounty.title}
              </h1>
              <p className="text-sm text-ink/60">
                {bounty.campaign} · {bounty.category}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <section>
                <h2 className="text-sm font-semibold text-ink">Task</h2>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  {bounty.description}
                </p>
              </section>
              <section>
                <h2 className="text-sm font-semibold text-ink">
                  Valid submission
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  {bounty.deliverable}
                </p>
              </section>
            </div>

            <dl className="grid gap-3 border-t border-hairline pt-6 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-ink/50">Reward</dt>
                <dd className="mt-1 font-semibold text-forest">
                  ₦{bounty.reward.toLocaleString()} each
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink/50">Spots</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {bounty.availableSpots}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink/50">Deadline</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {new Date(bounty.deadline).toLocaleDateString("en-NG")}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card variant="surface" className="h-fit">
          <CardContent className="space-y-6 p-5 sm:p-6">
            <div>
              <h2 className="font-fraunces text-2xl text-ink">
                Make a decision
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink/60">
                Approve when the task and proof are clear, or tell the owner
                exactly what to fix.
              </p>
            </div>

            <div className="rounded-xl bg-bone p-4 text-sm text-ink/70">
              <div className="flex justify-between gap-4">
                <span>Campaign owner</span>
                <strong className="text-right text-ink">{bounty.owner}</strong>
              </div>
              <div className="mt-3 flex justify-between gap-4">
                <span>Maximum commitment</span>
                <strong className="text-right text-ink">
                  ₦{(bounty.reward * bounty.availableSpots).toLocaleString()}
                </strong>
              </div>
            </div>

            <Button
              className="w-full"
              variant="forest"
              onClick={() => setOutcome("approved")}
              disabled={outcome !== null}
            >
              Approve and publish
            </Button>

            <div className="space-y-2 border-t border-hairline pt-5">
              <Label htmlFor="feedback">Ask for changes</Label>
              <Textarea
                id="feedback"
                rows={5}
                value={form.feedback}
                onChange={(event) => {
                  setFormFields("feedback", event.target.value);
                  clearError("feedback");
                }}
                placeholder="Describe the exact change the owner should make."
              />
              <FieldError message={errors.feedback} />
              <Button
                className="w-full"
                variant="surface"
                onClick={requestChanges}
                disabled={outcome !== null}
              >
                Send change request
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
