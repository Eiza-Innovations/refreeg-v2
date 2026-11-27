import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Gift, Plus } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { MyWishlists } from "@/components/wishlist/my-wishlists";
import { getSessionUser } from "@/lib/auth/session-user";

export default async function MyWishlistsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/signin?redirect=/dashboard/wishlists");
  }

  return (
    <section className="px-4 pb-20 pt-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 border-b border-hairline pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-bone text-forest shadow-flat">
              <Gift className="h-3.5 w-3.5" />
            </span>
            <Eyebrow className="text-ink/60">Gift registry</Eyebrow>
          </div>
          <h1 className="mt-3 font-fraunces text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            My Wishlists
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink/70 sm:text-base">
            Every list you&apos;ve created, what&apos;s been given, and what
            your people still have their eye on.
          </p>
        </div>
        <Link href="/dashboard/wishlists/create" className="w-full sm:w-auto">
          <Button
            variant="ink"
            className="h-11 w-full rounded-lg px-5 sm:w-auto"
          >
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
