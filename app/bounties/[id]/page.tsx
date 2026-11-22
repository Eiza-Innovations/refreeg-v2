import type { Metadata } from "next";
import { BountyStatusView } from "@/components/bounties/BountyStatusView";
import { getBountyById } from "@/lib/bounties/bounty-mock-data";
import type { BountyStatus } from "@/types/bounty-types";

export const metadata: Metadata = {
  title: "Bounty status",
};

const bountyStatuses: BountyStatus[] = [
  "draft",
  "in-review",
  "changes-requested",
  "live",
];

export default async function BountyStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const bounty = getBountyById(id);
  const requestedStatus = query.status as BountyStatus;
  const status = bountyStatuses.includes(requestedStatus)
    ? requestedStatus
    : bounty.status;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <BountyStatusView bounty={bounty} status={status} />
    </div>
  );
}
