"use client";

import { useRef } from "react";
import Link from "next/link";
import { Gift, Link2, PartyPopper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { useGsap } from "@/hooks/use-gsap";

const STEPS = [
  {
    icon: Gift,
    title: "Name your gifts",
    body: "List what you actually want, each with its price: a study desk, a wig, fuel for the year. It takes about a minute.",
  },
  {
    icon: Link2,
    title: "Share one link",
    body: "Send your wishlist link to family, friends and colleagues. Anyone with the link can give toward any item.",
  },
  {
    icon: PartyPopper,
    title: "Watch gifts fund",
    body: "Every contribution fills the item's progress bar, givers can stay anonymous, and you're told by email each time.",
  },
];

export function WishlistLanding({ seasonal }: { seasonal: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);

  useGsap((gsap) => {
    const ctx = gsap.context(() => {
      gsap.from(".wl-landing-title", {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "power4.out",
      });

      gsap.from(".wl-landing-sub", {
        y: 28,
        opacity: 0,
        duration: 0.9,
        delay: 0.25,
        ease: "power3.out",
      });

      gsap.from(".wl-landing-actions", {
        y: 18,
        opacity: 0,
        duration: 0.8,
        delay: 0.45,
        ease: "power3.out",
      });

      gsap.from(".wl-landing-how", {
        y: 32,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".wl-landing-how",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(".wl-landing-steps > div", {
        y: 24,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".wl-landing-how",
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(".wl-landing-preview", {
        y: 32,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".wl-landing-preview",
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
      });
    }, sectionRef);
  }, sectionRef);

  return (
    <section ref={sectionRef} className="bg-cream">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="text-forest">
            {seasonal ? (
              <>
                The Refreeg holiday{" "}
                <span className="italic text-brand-blue">wishlist</span>
              </>
            ) : (
              <>
                The Refreeg{" "}
                <span className="italic text-brand-blue">wishlist</span>
              </>
            )}
          </Eyebrow>
          <h1 className="wl-landing-title mt-4 font-fraunces text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
            {seasonal
              ? "This Christmas, ask for the gifts you'd actually love."
              : "Show them what would actually make you smile."}
          </h1>
          <div className="wl-landing-actions mt-7 flex flex-col items-center gap-3">
            <Button
              asChild
              variant="lime"
              className="h-14 w-full rounded-2xl px-8 text-base font-semibold text-ink shadow-[0_10px_24px_-12px_hsl(var(--forest)/0.7)] sm:w-auto"
            >
              <Link href="/dashboard/wishlists/create">
                Create your wishlist
              </Link>
            </Button>
            <p className="text-[13px] text-ink/50">
              Free to use · takes about a minute
            </p>
          </div>
        </div>

        <div className="wl-landing-how mt-14 rounded-2xl border border-sand bg-sand/40 p-6 sm:p-8">
          <Eyebrow className="text-ink/60">How it works</Eyebrow>
          <div className="wl-landing-steps mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-forest shadow-flat">
                  <step.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-ink">
                    <span className="mr-1.5 text-ink/40">{index + 1}.</span>
                    {step.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-ink/60">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="wl-landing-preview mx-auto mt-12 max-w-md">
          <Eyebrow className="text-ink/45">What givers see</Eyebrow>
          <div className="mt-3 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-hairline bg-bone">
                <Gift className="h-5 w-5 text-ink/30" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold text-ink">A new study desk</p>
                  <p className="text-sm font-semibold text-ink">₦80,000</p>
                </div>
                <p className="mt-1 text-[13px] text-ink/55">
                  ₦52,400 contributed by 6 givers
                </p>
              </div>
            </div>
            <Progress
              value={65.5}
              indicatorVariant="forest"
              className="mt-3 h-2.5"
              aria-label="Sample item, 65 percent funded"
            />
            <Button
              variant="ink"
              disabled
              className="mt-4 h-11 w-full rounded-xl text-sm font-semibold"
              aria-label="Sample give button"
            >
              Give to this gift
            </Button>
          </div>
          <p className="mt-3 text-center text-[13px] text-ink/50">
            Every item gets its own bar, its own givers, its own thank-you.
          </p>
        </div>
      </div>
    </section>
  );
}
