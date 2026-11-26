import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";

import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * Landing-page entry point for wishlists: first-time visitors should be one
 * click away from the gift registry, the same way the hero hands them to
 * causes. Sits between the live-campaigns rail and the on-chain story.
 */
export function WishlistBand() {
  return (
    <section className="border-y border-hairline bg-bone">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="text-forest">Wishlists</Eyebrow>
          <h2 className="mt-3 font-fraunces text-3xl tracking-tight text-ink sm:text-4xl">
            Name the gifts you{" "}
            <em className="italic text-forest">actually want.</em>
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink/60 sm:text-base">
            List up to 8 items, share one link, and let family and friends give
            toward them together, anonymously if they prefer.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/wishlist/new"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-blue px-5 py-3 text-sm font-medium text-brand-blue-foreground transition-colors hover:bg-brand-blue/90"
            >
              <Gift className="h-4 w-4" aria-hidden="true" />
              Create a wishlist
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/wishlist"
              className="inline-flex items-center justify-center rounded-full border border-ink px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
            >
              See how wishlists work
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
