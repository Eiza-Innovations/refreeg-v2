"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Clock3, Loader2, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { toast } from "@/hooks/use-toast";
import { clearOnboardingStorage } from "@/lib/onboarding/storage";
import { getMediaUrl } from "@/lib/s3/media";
import type { Step4Props } from "@/types/onboarding-types";

export default function Step4({
  user,
  onNext,
  onKyc,
  onboardingData,
  updateOnboardingData,
}: Step4Props) {
  const isOrg = onboardingData.accountType === "organization";
  const { firstName, profilePhoto } = onboardingData.profile;

  const handleSkip = () => {
    updateOnboardingData("kycCompleted", false);
    clearOnboardingStorage();
    onNext();
  };

  const startKyc = useMutation({
    mutationFn: async () => {
      updateOnboardingData("kycCompleted", false);
      await onKyc();
    },
    onError: (error) =>
      toast({
        title: "Could not open verification",
        description: error.message,
        variant: "destructive",
      }),
  });

  return (
    <div className="py-2">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto w-full max-w-3xl"
      >
        {isOrg ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-lime">
            <ShieldCheck className="h-5 w-5" />
          </span>
        ) : (
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={getMediaUrl(profilePhoto || user.image) || undefined}
              alt=""
              className="object-cover"
            />
            <AvatarFallback className="bg-forest text-lg font-semibold text-lime">
              {firstName.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
        )}

        <h1 className="mt-5 font-fraunces text-4xl font-medium leading-tight text-ink sm:text-5xl">
          {isOrg ? "Verify the organisation owner" : "Secure your account"}
        </h1>
        <p className="mt-3 text-base leading-7 text-ink/70">
          {isOrg
            ? "Owner verification is required before the organisation can fundraise or receive payouts. It helps protect the workspace and builds trust with supporters."
            : "To keep the community safe and transparent, we verify your identity. It protects your donations and withdrawals, builds trust with supporters and keeps causes safe from fraud."}
        </p>

        <Card variant="surface" className="mt-8 grid sm:grid-cols-2">
          <div className="p-5 sm:border-r sm:border-hairline">
            <Eyebrow>What you will need</Eyebrow>
            <ul className="mt-3 space-y-2 text-sm text-ink/70">
              <li>A valid government-issued ID</li>
              <li>A clear live identity check</li>
            </ul>
          </div>
          <div className="border-t border-hairline p-5 sm:border-t-0">
            <Eyebrow>What to expect</Eyebrow>
            <p className="mt-3 flex items-center gap-2 text-sm text-ink/70">
              <Clock3 className="h-4 w-4 text-forest" />
              The process usually takes a few minutes.
            </p>
            <p className="mt-2 text-sm text-ink/70">
              Your information is encrypted and handled securely.
            </p>
          </div>
        </Card>

        <div className="mt-8 flex flex-col gap-3 border-t border-hairline pt-6 sm:flex-row-reverse">
          <Button
            variant="ink"
            onClick={() => startKyc.mutate()}
            disabled={startKyc.isPending}
            className="h-12 flex-1"
          >
            {startKyc.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening verification...
              </>
            ) : (
              <>
                Start verification
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          <Button
            variant="surface"
            onClick={handleSkip}
            className="h-12 flex-1"
          >
            Do this later
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
