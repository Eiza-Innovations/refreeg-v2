"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { InterestCard } from "@/components/onboarding/InterestCard";
import { Heading, Lead, Small } from "@/components/marketing/Typography";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FieldError } from "@/components/ui/field-error";
import { toast } from "@/hooks/use-toast";
import {
  interestOptions,
  MIN_INTERESTS_REQUIRED,
} from "@/lib/causes/interest-categories";
import {
  getInterestOptions,
  saveUserInterests,
} from "@/actions/users/interest-actions";
import type { StepInterestsProps } from "@/types/onboarding-types";

// Shown while the campaign counts load, so the choices appear at once.
const optionsWithoutCounts = interestOptions.map((option) => ({
  id: option.id,
  label: option.label,
  count: null,
}));

export default function StepInterests({
  user,
  onNext,
  onboardingData,
  updateOnboardingData,
}: StepInterestsProps) {
  const [selected, setSelected] = useState<string[]>(
    onboardingData.interests || [],
  );

  const interests = useQuery({
    queryKey: ["interest-options"],
    queryFn: getInterestOptions,
  });
  const options = interests.data ?? optionsWithoutCounts;

  const iconFor = (id: string) =>
    interestOptions.find((o) => o.id === id)?.icon;

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const hasMinimum = selected.length >= MIN_INTERESTS_REQUIRED;

  const save = useMutation({
    mutationFn: () => saveUserInterests(user.id, { interests: selected }),
    onSuccess: () => {
      updateOnboardingData("interests", selected);
      onNext();
    },
    onError: (error) =>
      toast({
        title: "Could not save your interests",
        description: error.message,
        variant: "destructive",
      }),
  });

  const handleContinue = () => {
    if (hasMinimum && !save.isPending) save.mutate();
  };

  return (
    <div className="py-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto w-full max-w-3xl"
      >
        <Eyebrow>Personalize your feed</Eyebrow>
        <Heading as="h1" size="block" className="mt-3 font-semibold">
          What do you want to fund?
        </Heading>
        <Lead className="mt-2 text-sm leading-6 text-ink/70 sm:text-sm md:text-sm">
          Pick at least {MIN_INTERESTS_REQUIRED}. We&apos;ll use these to show
          you campaigns worth your attention first.
        </Lead>

        <CalloutBanner
          className="mt-6"
          variant="gold"
          icon={<Sparkles className="mt-0.5 h-5 w-5 shrink-0" />}
          title="150 EIZA already credited"
          description="You earned that just for verifying your email. Thanks for joining."
        />

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {options.map((option) => (
            <InterestCard
              key={option.id}
              label={option.label}
              icon={iconFor(option.id)}
              count={option.count}
              countsLoaded={!interests.isPending}
              selected={selected.includes(option.id)}
              onToggle={() => toggle(option.id)}
            />
          ))}
        </div>
        <FieldError message={interests.error?.message} />

        <Small className="mt-4 block text-ink/50">
          {selected.length} of {options.length} chosen · Minimum{" "}
          {MIN_INTERESTS_REQUIRED}
        </Small>

        <div className="mt-8 flex flex-col gap-3 border-t border-ink/10 pt-6 sm:flex-row-reverse">
          <Button
            onClick={handleContinue}
            disabled={!hasMinimum || save.isPending}
            variant="ink"
            className="h-12 flex-1"
          >
            {save.isPending ? "Saving..." : "Continue"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
