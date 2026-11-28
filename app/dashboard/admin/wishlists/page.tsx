import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/actions/admin/role-actions";
import { getAdminWishlistQueue } from "@/actions/admin/admin-wishlist-actions";
import { WishlistQueueClient } from "./wishlist-queue-client";

export const metadata = { title: "Wishlists - Admin" };

export default async function AdminWishlistsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");
  const userRole = await getUserRole(userId);
  if (!userRole || (userRole !== "admin" && userRole !== "manager")) {
    return (
      <div className="p-6">
        <p className="text-sm text-rust">Access denied.</p>
      </div>
    );
  }

  const queue = await getAdminWishlistQueue();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
          Review
        </p>
        <h1 className="mt-1 font-fraunces text-3xl font-medium text-ink">
          Wishlists
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          Every wishlist on the platform with its owner and gift totals.
          Removing one hides it from discovery and stops new gifts; restoring
          hands it back to the owner as active.
        </p>
      </div>
      <WishlistQueueClient rows={queue.rows} counts={queue.counts} />
    </div>
  );
}
