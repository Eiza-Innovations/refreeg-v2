import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Landmark } from "lucide-react";

import { getWishlistCreationReadiness } from "@/actions/wishlists/wishlist-actions";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CreateWishlistForm } from "@/components/wishlist/create-wishlist-form";
import { isWishlistSeasonActive } from "@/lib/wishlist/season";

export const metadata: Metadata = {
  title: "Create a wishlist",
  robots: { index: false },
};

// A wishlist collects real gifts for its owner, so payout setup comes
// before the first list exists, not after the first gift lands.
export default async function NewWishlistPage() {
  const readiness = await getWishlistCreationReadiness();

  // Middleware redirects signed-out visitors; this guard keeps the page
  // correct even if it is ever rendered outside the middleware matcher.
  if (!readiness.signedIn) {
    redirect("/auth/signin?redirect=/wishlist/new");
  }

  // The share URL is /<username>/<slug>, so a wishlist needs its owner's
  // username to exist; claim one first.
  if (!readiness.username) {
    redirect("/onboarding");
  }

  if (!readiness.kycVerified || !readiness.bankAdded) {
    return (
      <section className="bg-cream">
        <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
          <Eyebrow className="text-forest">
            One step before your wishlist
          </Eyebrow>
          <h1 className="mt-3 font-fraunces text-3xl tracking-tight text-ink">
            Finish your payout setup
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Your wishlist collects real gifts for you, so payouts need to be
            ready first. Once this is done, gifts split straight to your bank
            account.
          </p>

          <div className="mt-7 space-y-3">
            {!readiness.kycVerified && (
              <div className="rounded-2xl border border-hairline bg-surface p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream text-forest shadow-flat">
                    <BadgeCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">
                      Verify your identity
                    </p>
                    <p className="mt-1 text-[13px] leading-5 text-ink/55">
                      Confirm it&apos;s really you, so gifts go to the right
                      person.
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="ink"
                    className="h-10 shrink-0 rounded-lg px-4 text-sm font-semibold"
                  >
                    <Link href="/dashboard/settings/kyc">Start</Link>
                  </Button>
                </div>
              </div>
            )}
            {!readiness.bankAdded && (
              <div className="rounded-2xl border border-hairline bg-surface p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream text-forest shadow-flat">
                    <Landmark className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">
                      Add your bank account
                    </p>
                    <p className="mt-1 text-[13px] leading-5 text-ink/55">
                      Tell us where the gifts should land.
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="ink"
                    className="h-10 shrink-0 rounded-lg px-4 text-sm font-semibold"
                  >
                    <Link href="/dashboard/settings/bank">Open Settings</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-[13px] leading-5 text-ink/50">
            Already done one of these? The page updates as soon as Settings
            saves it.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
        <CreateWishlistForm
          seasonal={isWishlistSeasonActive()}
          username={readiness.username}
        />
      </div>
    </section>
  );
}
