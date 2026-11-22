import { CalendarDays, CircleDollarSign, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  bountyCampaignOptions,
  bountyCategoryOptions,
} from "@/lib/options/bounty.options";
import type { BountyFormFields } from "@/types/bounty-types";

export function BountySummary({ bounty }: { bounty: BountyFormFields }) {
  const campaign = bountyCampaignOptions.find(
    (option) => option.value === bounty.campaign,
  )?.label;
  const category = bountyCategoryOptions.find(
    (option) => option.value === bounty.category,
  )?.label;
  const totalReward = Number(bounty.reward) * Number(bounty.availableSpots);

  return (
    <Card variant="surface">
      <CardContent className="space-y-7 p-5 sm:p-8">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink/50">
            <span>{category}</span>
            <span aria-hidden="true">·</span>
            <span>{campaign}</span>
          </div>
          <h2 className="font-fraunces text-2xl font-medium text-ink sm:text-3xl">
            {bounty.title}
          </h2>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-bone p-4">
            <dt className="flex items-center gap-2 text-xs font-medium text-ink/50">
              <CircleDollarSign className="h-4 w-4" /> Reward
            </dt>
            <dd className="mt-2 font-semibold text-ink">
              ₦{Number(bounty.reward).toLocaleString()} each
            </dd>
          </div>
          <div className="rounded-xl bg-bone p-4">
            <dt className="flex items-center gap-2 text-xs font-medium text-ink/50">
              <Users className="h-4 w-4" /> Available
            </dt>
            <dd className="mt-2 font-semibold text-ink">
              {bounty.availableSpots} spots
            </dd>
          </div>
          <div className="rounded-xl bg-bone p-4">
            <dt className="flex items-center gap-2 text-xs font-medium text-ink/50">
              <CalendarDays className="h-4 w-4" /> Deadline
            </dt>
            <dd className="mt-2 font-semibold text-ink">
              {new Date(bounty.deadline).toLocaleDateString("en-NG")}
            </dd>
          </div>
        </dl>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Task</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              {bounty.description}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">
              Required submission
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              {bounty.deliverable}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-hairline pt-5 text-sm">
          <span className="text-ink/60">Maximum reward commitment</span>
          <strong className="text-forest">
            ₦{totalReward.toLocaleString()}
          </strong>
        </div>
      </CardContent>
    </Card>
  );
}
