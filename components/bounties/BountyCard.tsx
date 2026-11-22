import Link from "next/link";
import { ArrowRight, CalendarDays, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BountyStatusBadge } from "@/components/bounties/BountyStatusBadge";
import type { Bounty } from "@/types/bounty-types";

export function BountyCard({ bounty }: { bounty: Bounty }) {
  const statusQuery = new URLSearchParams({ status: bounty.status }).toString();

  return (
    <Card variant="surface" className="overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <BountyStatusBadge status={bounty.status} />
              <span className="text-xs font-medium text-ink/50">
                {bounty.category}
              </span>
            </div>
            <div>
              <h2 className="font-fraunces text-xl font-medium text-ink sm:text-2xl">
                {bounty.title}
              </h2>
              <p className="mt-1 text-sm text-ink/60">{bounty.campaign}</p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/60">
              <span className="font-semibold text-forest">
                ₦{bounty.reward.toLocaleString()} per reward
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {bounty.availableSpots} spots
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Closes {new Date(bounty.deadline).toLocaleDateString("en-NG")}
              </span>
            </div>
          </div>
          <Button asChild variant="surface" className="shrink-0">
            <Link href={`/bounties/${bounty.id}?${statusQuery}`}>
              View bounty
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
