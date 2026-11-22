"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MessageSquareWarning,
} from "lucide-react";
import { BountyStatusBadge } from "@/components/bounties/BountyStatusBadge";
import { DeleteBountyDialog } from "@/components/bounties/DeleteBountyDialog";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Card, CardContent } from "@/components/ui/card";
import { saveBountyDraft } from "@/hooks/use-bounty-draft";
import {
  bountyCampaignOptions,
  bountyCategoryOptions,
} from "@/lib/options/bounty.options";
import type { Bounty, BountyStatus } from "@/types/bounty-types";

const statusContent = {
  draft: {
    title: "Finish your bounty",
    description: "Complete the details, then submit it for approval.",
    icon: Clock3,
  },
  "in-review": {
    title: "Your bounty is in review",
    description:
      "An admin is checking the task, reward and submission requirements. Reviews usually take up to two working days.",
    icon: Clock3,
  },
  "changes-requested": {
    title: "Changes requested",
    description:
      "Update the bounty using the admin's feedback, then submit it again.",
    icon: MessageSquareWarning,
  },
  live: {
    title: "Your bounty is approved and live",
    description:
      "People can now apply and submit proof. You will be notified when a submission is ready to review.",
    icon: CheckCircle2,
  },
} as const;

export function BountyStatusView({
  bounty,
  status,
}: {
  bounty: Bounty;
  status: BountyStatus;
}) {
  const router = useRouter();
  const content = statusContent[status];
  const StatusIcon = content.icon;
  const isChangesRequested = status === "changes-requested";
  const isLive = status === "live";

  const editBounty = () => {
    saveBountyDraft({
      title: bounty.title,
      campaign:
        bountyCampaignOptions.find((option) => option.label === bounty.campaign)
          ?.value ?? "",
      category:
        bountyCategoryOptions.find((option) => option.label === bounty.category)
          ?.value ?? "",
      description: bounty.description,
      deliverable: bounty.deliverable,
      reward: String(bounty.reward),
      availableSpots: String(bounty.availableSpots),
      deadline: bounty.deadline,
    });
    router.push("/bounties/new");
  };

  return (
    <div className="space-y-6">
      <Card variant="surface">
        <CardContent className="p-5 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bone text-ink">
                <StatusIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h1 className="font-fraunces text-3xl tracking-tight text-ink">
                    {content.title}
                  </h1>
                  <BountyStatusBadge status={status} />
                </div>
                <p className="max-w-2xl text-sm leading-6 text-ink/60">
                  {content.description}
                </p>
              </div>
            </div>
            {isLive ? (
              <Button asChild variant="ink">
                <Link href="/bounties">
                  View live bounty
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>

          {isChangesRequested ? (
            <CalloutBanner
              className="mt-7"
              variant="rust"
              title="What needs to change"
              description={bounty.changesRequested}
              icon={
                <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0" />
              }
            />
          ) : null}

          <div className="mt-8 grid gap-5 border-t border-hairline pt-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-ink/50">Bounty</p>
              <p className="mt-1 font-medium text-ink">{bounty.title}</p>
              <p className="mt-1 text-xs text-ink/50">{bounty.campaign}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-ink/50">Reward</p>
              <p className="mt-1 font-medium text-forest">
                ₦{bounty.reward.toLocaleString()} × {bounty.availableSpots}{" "}
                spots
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-ink/50">Deadline</p>
              <p className="mt-1 font-medium text-ink">
                {new Date(bounty.deadline).toLocaleDateString("en-NG")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="surface">
          <Link href="/bounties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            My bounties
          </Link>
        </Button>
        {isChangesRequested ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <DeleteBountyDialog
              bountyTitle={bounty.title}
              onDelete={() => router.push("/bounties")}
            />
            <Button variant="lime" onClick={editBounty}>
              Edit bounty
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
