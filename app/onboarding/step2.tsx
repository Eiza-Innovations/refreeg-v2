"use client";

import { useState } from "react";
import { CircleHelp, User, UserRound } from "lucide-react";
import { ChoiceCard } from "@/components/onboarding/ChoiceCard";
import { Button } from "@/components/ui/button";
import { genderOptions } from "@/lib/options/profile.options";
import type { Step2Props } from "@/types/onboarding-types";
import { onboardingSplitClass } from "@/components/onboarding/split-layout";

const genderIcons = {
  male: User,
  female: UserRound,
  other: CircleHelp,
} as const;

export default function Step2({
  onNext,
  onboardingData,
  updateOnboardingData,
}: Step2Props) {
  const [selected, setSelected] = useState(onboardingData.gender);

  const handleNext = () => {
    if (!selected) return;
    updateOnboardingData("gender", selected);
    onNext(selected);
  };

  return (
    <div className={onboardingSplitClass}>
      <div className="flex flex-col">
        <h1 className="font-fraunces text-4xl font-medium text-ink sm:text-5xl">
          What&apos;s your gender?
        </h1>
        <p className="mt-4 text-base leading-7 text-ink/70">
          We use this to personalise what you see on your dashboard.
        </p>
        <div className="mt-8 flex gap-3 lg:mt-auto lg:pt-8">
          <Button
            type="button"
            variant="ink"
            onClick={handleNext}
            disabled={!selected}
            className="h-12 px-10"
          >
            Continue
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {genderOptions.map((option) => (
          <ChoiceCard
            key={option.value}
            icon={genderIcons[option.value as keyof typeof genderIcons]}
            label={option.label}
            active={selected === option.value}
            onSelect={() => setSelected(option.value)}
          />
        ))}
      </div>
    </div>
  );
}
