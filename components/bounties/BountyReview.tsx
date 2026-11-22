"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import { BountySummary } from "@/components/bounties/BountySummary";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { useBountyDraft } from "@/hooks/use-bounty-draft";
import { sampleBountyForm } from "@/lib/bounties/bounty-mock-data";

export function BountyReview() {
  const router = useRouter();
  const { form } = useBountyDraft(sampleBountyForm);

  return (
    <div className="space-y-6">
      <BountySummary bounty={form} />
      <CalloutBanner
        variant="gold"
        title="Your bounty will be reviewed before it goes live"
        description="An admin checks that the task, proof and reward are clear. You will get a decision or change request in your notifications."
        icon={<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
      />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="surface">
          <Link href="/bounties/new">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button asChild variant="subtle">
            <Link href="/bounties/new">
              <Pencil className="mr-2 h-4 w-4" />
              Edit bounty
            </Link>
          </Button>
          <Button
            variant="lime"
            onClick={() =>
              router.push("/bounties/campaign-video?status=in-review")
            }
          >
            Submit for approval
          </Button>
        </div>
      </div>
    </div>
  );
}
