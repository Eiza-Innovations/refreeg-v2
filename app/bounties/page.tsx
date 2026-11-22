import Link from "next/link";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { BountyList } from "@/components/bounties/BountyList";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ownerBounties } from "@/lib/bounties/bounty-mock-data";

export const metadata: Metadata = {
  title: "My bounties",
  description: "Create and manage campaign bounties.",
};

export default function BountiesPage() {
  const liveCount = ownerBounties.filter(
    (bounty) => bounty.status === "live",
  ).length;
  const awaitingDecisionCount = ownerBounties.filter(
    (bounty) => bounty.status === "in-review",
  ).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Eyebrow>Campaign tools</Eyebrow>
          <h1 className="font-fraunces text-3xl tracking-tight text-ink sm:text-4xl">
            My bounties
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-ink/60">
            Reward people for completing clear, measurable work that moves your
            campaign forward.
          </p>
        </div>
        <Button asChild variant="ink">
          <Link href="/bounties/new">
            <Plus className="mr-2 h-4 w-4" />
            New bounty
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-xs font-medium text-ink/60">
        <span className="rounded-full bg-bone px-3 py-1.5">
          {ownerBounties.length} total
        </span>
        <span className="rounded-full bg-gold/25 px-3 py-1.5">
          {awaitingDecisionCount} awaiting decision
        </span>
        <span className="rounded-full bg-lime/25 px-3 py-1.5">
          {liveCount} live
        </span>
      </div>

      <BountyList bounties={ownerBounties} />
    </div>
  );
}
