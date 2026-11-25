import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/actions/users/auth-actions";
import { CreateWishlistForm } from "@/components/wishlist/create-wishlist-form";
import { isWishlistSeasonActive } from "@/lib/wishlist/season";

export const metadata: Metadata = {
  title: "Create a wishlist | Refreeg",
  robots: { index: false },
};

export default async function NewWishlistPage() {
  // Middleware redirects signed-out visitors; this guard keeps the page
  // correct even if it is ever rendered outside the middleware matcher.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin?redirect=/wishlist/new");
  }

  // The share URL is /<username>/<slug>, so a wishlist needs its owner's
  // username to exist; claim one first.
  if (!user.username) {
    redirect("/onboarding");
  }

  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
        <CreateWishlistForm
          seasonal={isWishlistSeasonActive()}
          username={user.username}
        />
      </div>
    </section>
  );
}
