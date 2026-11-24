"use client";

import { useState } from "react";
import { Building2, Heart, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { organizationPurposeOptions } from "@/lib/options/organization.options";

interface Step1Props {
  user: any;
  onNext: (
    accountType: "individual" | "organization",
    meta?: { organizationPurpose?: string },
  ) => void;
  onboardingData: any;
}

const accountOptions = [
  {
    key: "individual",
    accountType: "individual",
    label: "Individual",
    description: "Create causes, give to causes, sign petitions and earn EIZA.",
    icon: Heart,
  },
  {
    key: "organization",
    accountType: "organization",
    label: "Organisation",
    description: "An NGO, company or foundation giving or raising as a team.",
    icon: Building2,
  },
] as const;

type SelectedKey = "individual" | "organization";

export default function Step1({ onNext, onboardingData }: Step1Props) {
  const [selected, setSelected] = useState<SelectedKey>(
    onboardingData.accountType === "organization"
      ? "organization"
      : "individual",
  );
  const [purpose, setPurpose] = useState<string>(
    onboardingData.organizationPurpose || "",
  );

  const handleNext = () => {
    if (selected === "organization") {
      if (!purpose) return;
      onNext("organization", { organizationPurpose: purpose });
      return;
    }
    onNext("individual");
  };

  return (
    <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
      <div className="flex flex-col">
        <h1 className="font-fraunces text-4xl font-medium text-ink sm:text-5xl">
          How will you use RefreeG?
        </h1>
        <p className="mt-4 text-base leading-7 text-ink/70">
          {selected === "organization"
            ? "Organisations get a shared account, team seats and a separate verification."
            : "Pick the one that fits best. It decides what we ask next and what your dashboard shows."}
        </p>
        {selected === "organization" ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-accent/30 bg-blue-accent/10 p-4 text-sm leading-6 text-blue-accent">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Organisation accounts are verified with registration documents
              before any payout or CSR giving.
            </p>
          </div>
        ) : null}
        <div className="mt-8 flex gap-3 lg:mt-auto lg:pt-8">
          <Button
            type="button"
            onClick={handleNext}
            disabled={selected === "organization" && !purpose}
            className="h-12 bg-ink px-10 text-ink-foreground hover:bg-ink/90"
          >
            Continue
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          {accountOptions.map((option) => {
            const Icon = option.icon;
            const active = selected === option.key;

            return (
              <motion.button
                key={option.key}
                type="button"
                onClick={() => setSelected(option.key)}
                whileTap={{ scale: 0.99 }}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-center gap-4 rounded-xl border bg-surface px-4 py-4 text-left transition-colors",
                  active
                    ? "border-blue-accent bg-blue-accent/10"
                    : "border-hairline hover:border-ink/40",
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cream-muted">
                  <Icon className="h-5 w-5 text-ink" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-ink">
                    {option.label}
                  </span>
                  <span className="block text-sm text-ink/60">
                    {option.description}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    active ? "border-blue-accent" : "border-ink/30",
                  )}
                >
                  {active ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-accent" />
                  ) : null}
                </span>
              </motion.button>
            );
          })}
        </div>

        {selected === "organization" ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-hairline bg-surface p-5"
          >
            <p className="text-sm font-semibold text-ink">
              What brings your organisation here?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {organizationPurposeOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPurpose(item.value)}
                  aria-pressed={purpose === item.value}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    purpose === item.value
                      ? "bg-ink text-ink-foreground"
                      : "bg-cream-muted text-ink hover:bg-warm-neutral",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
