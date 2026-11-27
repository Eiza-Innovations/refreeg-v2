"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { safeRedirect } from "@/lib/auth/safe-redirect";
import type { Step5Props } from "@/types/onboarding-types";

export default function Step5({
  user,
  onComplete,
  onboardingData,
}: Step5Props) {
  const isOrg = onboardingData.accountType === "organization";
  // With a redirect from the page they came from, the button takes them back
  // there, so "Go to dashboard" would be wrong.
  const hasRedirect = !!safeRedirect(useSearchParams().get("redirect"));
  const name = onboardingData.profile.firstName || user.name || "there";

  const copy = isOrg
    ? {
        title: "Your organisation is ready",
        text: `Welcome, ${name}. You can now manage your workspace, invite colleagues, and create your first cause.`,
        primary: {
          label: "Create your first cause",
          to: "/dashboard/causes/create",
        },
        secondary: { label: "Open workspace dashboard", to: undefined },
      }
    : {
        title: `Thank you, ${name}`,
        text: "You can start supporting causes that matter to you today.",
        primary: {
          label: hasRedirect ? "Continue" : "Go to dashboard",
          to: undefined,
        },
        secondary: { label: "Explore causes", to: "/causes" },
      };

  return (
    <div className="flex min-h-[520px] items-center justify-center py-4 text-center">
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-lime">
          {isOrg ? (
            <Building2 className="h-7 w-7" />
          ) : (
            <Check className="h-7 w-7" />
          )}
        </span>

        <h1 className="mt-7 font-fraunces text-4xl font-medium text-ink sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-ink/70">
          {copy.text}
        </p>

        {isOrg && (
          <CalloutBanner
            variant="gold"
            title="Verify the owner before you launch"
            description="If you postponed owner verification, complete it before launching a fundraiser or receiving payouts."
            className="mx-auto mt-7 max-w-xl text-left"
          />
        )}

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            variant="ink"
            onClick={() => onComplete(copy.primary.to)}
            className="h-12 px-8"
          >
            {copy.primary.label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="surface"
            onClick={() => onComplete(copy.secondary.to)}
            className="h-12 px-8"
          >
            {copy.secondary.label}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
