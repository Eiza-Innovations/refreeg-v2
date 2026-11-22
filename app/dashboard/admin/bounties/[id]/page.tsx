import type { Metadata } from "next";
import { AdminBountyDecision } from "@/components/bounties/AdminBountyDecision";
import { getBountyById } from "@/lib/bounties/bounty-mock-data";

export const metadata: Metadata = {
  title: "Review bounty",
};

export default async function AdminBountyDecisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bounty = getBountyById(id);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminBountyDecision bounty={bounty} />
    </div>
  );
}
