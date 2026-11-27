import type { Metadata } from "next";
import { AdminBountyQueue } from "@/components/bounties/AdminBountyQueue";
import { listAdminBounties } from "@/actions/admin/admin-bounty-actions";

export const metadata: Metadata = {
  title: "Bounty review queue",
};

export const dynamic = "force-dynamic";

export default async function AdminBountiesPage() {
  const bounties = await listAdminBounties();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminBountyQueue bounties={bounties} />
    </div>
  );
}
