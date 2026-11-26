import type { Metadata } from "next";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { getWishlistCreationReadiness } from "@/actions/wishlists/wishlist-actions";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CreateWishlistForm } from "@/components/wishlist/create-wishlist-form";
import { isWishlistSeasonActive } from "@/lib/wishlist/season";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Create a wishlist",
  robots: { index: false },
};

// A wishlist collects real gifts for its owner, so payout setup comes
// before the first list exists, not after the first gift lands. The page
// mirrors the cause creation flow: same builder shell, same readiness
// callouts, same wizard.
export default async function CreateWishlistPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?redirect=/dashboard/wishlists/create");
  }

  const readiness = await getWishlistCreationReadiness();

  // The share URL is /<username>/<slug>, so a wishlist needs its owner's
  // username to exist; claim one first.
  if (!readiness.username) {
    redirect("/onboarding");
  }

  if (!readiness.kycVerified || !readiness.bankAdded) {
    return (
      <div className="min-h-screen w-full bg-cream px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="mb-6">
            <Eyebrow>Wishlist builder</Eyebrow>
            <h1 className="mt-2 font-fraunces text-3xl font-medium text-ink sm:text-4xl">
              A couple of things first
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
              Your wishlist collects real gifts for you, so payouts need to be
              ready first. Once this is done, gifts split straight to your bank
              account.
            </p>
          </div>

          {!readiness.kycVerified && (
            <CalloutBanner
              variant="gold"
              className="flex-col sm:flex-row"
              title="Verify your identity to start a wishlist"
              description="Confirm it's really you, so gifts go to the right person."
              action={
                <Button asChild variant="ink" size="sm" className="shrink-0">
                  <Link href="/dashboard/settings/kyc">Start verification</Link>
                </Button>
              }
            />
          )}

          {!readiness.bankAdded && (
            <CalloutBanner
              variant="gold"
              className="flex-col sm:flex-row"
              title="Add your bank details"
              description="Tell us where the gifts should land; each funded item splits straight to this account."
              action={
                <Button asChild variant="ink" size="sm" className="shrink-0">
                  <Link href="/dashboard/settings/bank">Add bank details</Link>
                </Button>
              }
            />
          )}

          <p className="text-[13px] leading-5 text-ink/50">
            Already done one of these? The page updates as soon as Settings
            saves it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-cream px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <CreateWishlistForm
        seasonal={isWishlistSeasonActive()}
        username={readiness.username}
      />
    </div>
  );
}
