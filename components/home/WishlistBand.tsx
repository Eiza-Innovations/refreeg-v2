"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";

import { useGsap } from "@/hooks/use-gsap";

/**
 * Landing-page entry point for wishlists: first-time visitors should be one
 * click away from the gift registry, the same way the hero hands them to
 * causes. Title carries the same treatment as the hero's "lands." accent.
 */
export function WishlistBand() {
  const sectionRef = useRef<HTMLElement>(null);

  useGsap((gsap) => {
    const ctx = gsap.context(() => {
      gsap.from(".wishlist-band-title", {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(".wishlist-band-copy", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        delay: 0.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(".wishlist-band-actions", {
        y: 16,
        opacity: 0,
        duration: 0.8,
        delay: 0.4,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      });
    }, sectionRef);
  }, sectionRef);

  return (
    <section
      ref={sectionRef}
      className="border-y border-hairline bg-bone"
      aria-labelledby="wishlist-band-title"
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="wishlist-band-title"
            className="wishlist-band-title text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl md:text-6xl"
          >
            Wish<span className="italic text-brand-blue">lists.</span>
          </h2>
          <p className="wishlist-band-copy mt-3 font-fraunces text-2xl leading-snug tracking-tight text-ink sm:text-3xl">
            Name the gifts you{" "}
            <em className="italic text-forest">actually want.</em>
          </p>
          <p className="wishlist-band-copy mt-3 text-sm leading-6 text-ink/60 sm:text-base">
            Birthdays, weddings, back-to-school, December. List up to 8 items,
            share one link, and let loved ones contribute together, anonymously
            if they wish.
          </p>

          <div className="wishlist-band-actions mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard/wishlists/create"
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
