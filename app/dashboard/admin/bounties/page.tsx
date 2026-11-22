import type { Metadata } from "next";
import { AdminBountyQueue } from "@/components/bounties/AdminBountyQueue";
import { adminBounties } from "@/lib/bounties/bounty-mock-data";

export const metadata: Metadata = {
  title: "Bounty review queue",
};

export default function AdminBountiesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminBountyQueue bounties={adminBounties} />
    </div>
  );
}
