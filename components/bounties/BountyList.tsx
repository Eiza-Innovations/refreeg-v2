import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { BountyCard } from "@/components/bounties/BountyCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Bounty } from "@/types/bounty-types";

export function BountyList({ bounties }: { bounties: Bounty[] }) {
  if (bounties.length === 0) {
    return (
      <EmptyState
        variant="page"
        icon={<Trophy className="h-7 w-7" />}
        title="Create your first bounty"
        description="Offer a clear reward for work that helps your campaign move forward."
        action={
          <Button asChild variant="ink">
            <Link href="/bounties/new">
              <Plus className="mr-2 h-4 w-4" />
              New bounty
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {bounties.map((bounty) => (
        <BountyCard key={bounty.id} bounty={bounty} />
      ))}
    </div>
  );
}
