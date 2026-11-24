"use client";

import { Panel } from "./primitives";
import { LinePlot } from "./charts";
import type { WorkspaceData } from "./types";

function Empty({ children }: { children: string }) {
  return <p className="py-8 text-center text-xs text-ink/60">{children}</p>;
}

export function CommunityContent({ data }: { data: WorkspaceData }) {
  const { donations, referrals } = data.community.referralImpact;

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Panel
        title="Referral impact"
        aside={
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-accent" />
              Donations
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-forest" />
              Referrals
            </span>
          </div>
        }
      >
        <div className="[&_svg]:h-[180px]">
          <LinePlot
            values={donations.values}
            secondary={referrals.values}
            secondaryIndependent
            labels={donations.labels}
            tone="blue"
          />
        </div>
        <p className="mt-2 text-[11px] text-ink/40">
          Donations (₦) and referrals (count) are different units — each line is
          scaled to its own range to compare trend shape, not size.
        </p>
      </Panel>
      <Panel title="Bounty ROI by type">
        <Empty>No bounty data yet — bounties aren&apos;t live.</Empty>
      </Panel>
      <Panel title="Reach by platform">
        <Empty>Platform-level share data isn&apos;t tracked yet.</Empty>
      </Panel>
    </div>
  );
}
