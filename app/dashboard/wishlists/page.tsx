import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Gift, Plus } from "lucide-react";
import { MyWishlists } from "@/components/wishlist/my-wishlists";
import { getSessionUser } from "@/lib/auth/session-user";

export default async function MyWishlistsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/signin?redirect=/dashboard/wishlists");
  }

  return (
    <section className="px-3 py-3 sm:px-5 sm:py-5 lg:px-6">
      <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
              <Gift className="h-3.5 w-3.5" />
            </span>
            Gift registry
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            My Wishlists
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Every list you&apos;ve created, what&apos;s been given, and what
            your people still have their eye on.
          </p>
        </div>
        <Link href="/wishlist/new" className="w-full sm:w-auto">
          <Button className="h-11 w-full rounded-xl bg-blue-600 px-5 text-white shadow-sm hover:bg-blue-700 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New wishlist
          </Button>
        </Link>
      </div>

      <div className="mt-6">
        <MyWishlists />
      </div>
    </section>
  );
}
