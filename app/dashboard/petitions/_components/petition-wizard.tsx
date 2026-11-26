"use client";

import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Icons } from "@/components/layout/Icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Stepper } from "@/components/ui/stepper";
import { Heading, Lead } from "@/components/marketing/Typography";
import { useAuth } from "@/hooks/use-auth";
import { usePetition } from "@/hooks/use-petition";
import { usePetitionDraft } from "@/hooks/use-petition-draft";
import { LAST_PETITION_STEP, usePetitionForm } from "@/hooks/use-petition-form";
import { sendPetitionUnderReviewEmail } from "@/services/mail";
import {
  emptyPetitionValues,
  petitionToFormValues,
} from "@/lib/petitions/form-values";
import type { Petition } from "@/types";
import { PetitionBasicsStep } from "./basics-step";
import { PetitionMediaStep } from "./media-step";
import { petitionCopy } from "./petition-copy";
import { PetitionReviewStep } from "./review-step";
import { PetitionStoryStep } from "./story-step";
import { PetitionTimelineStep } from "./timeline-step";

type Props =
  | { mode: "create"; petition?: undefined }
  | { mode: "edit"; petition: Petition };

/** The five-step petition wizard shared by the create and edit pages. */
export function PetitionWizard({ mode, petition }: Props) {
  const copy = petitionCopy[mode];
  const { user } = useAuth();
  const { isLoading, createPetition, updatePetition } = usePetition();
  const wizard = usePetitionForm({
    mode,
    initialValues: petition
      ? petitionToFormValues(petition)
      : emptyPetitionValues,
  });
  const { form, currentStep } = wizard;
  const { clearDraft } = usePetitionDraft({
    enabled: mode === "create",
    form,
    setForm: wizard.setForm,
    isSignedIn: Boolean(user),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const data = {
        title: form.title,
        category: form.category,
        goal: form.goal,
        coverImage: form.coverImage,
        sections: form.sections,
        startDate: form.startDate,
        endDate: form.endDate,
        multimedia: form.multimedia,
        video_links: form.videoLinks.map((link) => link.trim()).filter(Boolean),
      };

      if (petition) {
        await updatePetition(petition.id, user.id, {
          ...data,
          image: form.coverImage ? undefined : petition.image || undefined,
        });
        return;
      }
      await sendPetitionUnderReviewEmail({
        petitionName: form.title,
        reviewTimeframe: "3-5 business days",
      });
      await createPetition(user.id, { ...data, description: "" });
      clearDraft();
    },
    onError: (error) => console.error("Petition submit failed:", error),
  });

  const submit = () => {
    if (!user || !wizard.validate() || submitMutation.isPending) return;
    submitMutation.mutate();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (currentStep < LAST_PETITION_STEP) wizard.nextStep();
    else submit();
  };

  const busy = isLoading || submitMutation.isPending;
  const steps = copy.steps.map((label, i) => ({
    label,
    status:
      i + 1 < currentStep
        ? ("done" as const)
        : i + 1 === currentStep
          ? ("current" as const)
          : ("upcoming" as const),
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <header>
        <Eyebrow>
          Step {currentStep} of {copy.steps.length}
        </Eyebrow>
        <Heading as="h1" size="subsection" className="mt-2">
          {copy.title}
        </Heading>
        <Lead className="mt-2 text-sm text-ink/60">{copy.description}</Lead>
      </header>

      <Stepper steps={steps} className="mt-8" />

      <form onSubmit={handleSubmit}>
        <Card variant="surface" className="mt-8 p-5 sm:p-8">
          <div className="min-h-[360px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {currentStep === 1 && (
                  <PetitionBasicsStep {...wizard} copy={copy} />
                )}
                {currentStep === 2 && (
                  <PetitionStoryStep {...wizard} copy={copy} />
                )}
                {currentStep === 3 && (
                  <PetitionTimelineStep {...wizard} copy={copy} />
                )}
                {currentStep === 4 && (
                  <PetitionMediaStep {...wizard} copy={copy} />
                )}
                {currentStep === 5 && <PetitionReviewStep form={form} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="surface"
            onClick={wizard.prevStep}
            disabled={currentStep === 1 || busy}
            className="h-11 rounded-xl px-6"
          >
            Back
          </Button>
          {currentStep < LAST_PETITION_STEP ? (
            <Button
              key="next"
              type="button"
              variant="ink"
              onClick={wizard.nextStep}
              className="h-11 rounded-xl px-8"
            >
              Continue
            </Button>
          ) : (
            <Button
              key="submit"
              type="submit"
              variant="lime"
              disabled={busy}
              className="h-11 rounded-xl px-8"
            >
              {busy ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  {copy.submitting}
                </>
              ) : (
                copy.submit
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
