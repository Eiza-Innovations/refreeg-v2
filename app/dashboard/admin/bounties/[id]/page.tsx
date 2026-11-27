import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminBountyDecision } from "@/components/bounties/AdminBountyDecision";
import { getAdminBounty } from "@/actions/admin/admin-bounty-actions";

export const metadata: Metadata = {
  title: "Review bounty",
};

export const dynamic = "force-dynamic";

export default async function AdminBountyDecisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bounty = await getAdminBounty(id);
  if (!bounty) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminBountyDecision bounty={bounty} />
    </div>
  );
}
