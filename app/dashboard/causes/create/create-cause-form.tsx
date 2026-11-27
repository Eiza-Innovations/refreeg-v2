"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { addDays, startOfDay } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { createCause } from "@/actions/causes/cause-actions";
import { useCauseDraft } from "@/hooks/use-cause-draft";
import { useCauseForm } from "@/hooks/use-cause-form";
import { createCauseStepMeta } from "@/lib/options/cause.options";
import { campaignCategoryStyles } from "@/lib/causes/campaign-categories";
import type { CauseFormValues } from "@/lib/schemas/cause.schema";
import {
  resolveMultimediaForSubmit,
  uploadFileWithPresign,
} from "@/lib/s3/upload-client";
import { sendCauseUnderReviewEmail } from "@/services/mail";
import { CauseBasicsStep } from "../_components/basics-step";
import { CauseMediaStep } from "../_components/media-step";
import { CauseReviewStep } from "../_components/review-step";
import { CauseStoryStep } from "../_components/story-step";
import { CauseTimelineStep } from "../_components/timeline-step";
import { CauseWizard } from "../_components/cause-wizard";

const initialValues = (preselectedCategory: string): CauseFormValues => ({
  title: "",
  summary: "",
  location: "",
  category: preselectedCategory,
  goal: "",
  currency: "NGN",
  coverImage: null,
  image: "",
  sections: [{ heading: "", description: "" }],
  startDate: startOfDay(new Date()),
  endDate: addDays(startOfDay(new Date()), 7),
  multimedia: [],
  videoLinks: [],
});

export default function CreateCauseForm() {
  const searchParams = useSearchParams();
  const rawCategory = searchParams.get("category") ?? "";
  const preselectedCategory = campaignCategoryStyles.some(
    (c) => c.id === rawCategory,
  )
    ? rawCategory
    : "";
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const wizard = useCauseForm({
    initialValues: initialValues(preselectedCategory),
    mode: "create",
  });
  const { form, errors, setFormFields, currentStep } = wizard;
  const { clearDraft, saveDraft } = useCauseDraft({
    form,
    setForm: wizard.setForm,
    isSignedIn: Boolean(user),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const draftEntityId = crypto.randomUUID();
      let coverImage: File | string | null = form.coverImage;

      if (form.coverImage instanceof File) {
        const { key } = await uploadFileWithPresign(form.coverImage, {
          entityType: "causes",
          entityId: draftEntityId,
          mediaType: "images",
        });
        coverImage = key;
      }

      const multimedia = await resolveMultimediaForSubmit(form.multimedia, {
        entityType: "causes",
        entityId: draftEntityId,
      });

      await createCause(user.id, {
        title: form.title,
        summary: form.summary,
        location: form.location,
        category: form.category,
        goal: form.goal,
        currency: form.currency,
        coverImage,
        sections: form.sections,
        startDate: form.startDate,
        endDate: form.endDate,
        multimedia,
        video_links: form.videoLinks,
      });
    },
    onSuccess: () => {
      clearDraft();
      void queryClient.invalidateQueries({ queryKey: ["causes"] });
      sendCauseUnderReviewEmail({
        causeName: form.title,
        reviewTimeframe: "3-5 business days",
        dashboardUrl: `${window.location.origin}/dashboard/causes`,
      }).catch((error) => {
        console.error("Failed to send cause-under-review email:", error);
      });

      router.push("/dashboard/causes");
    },
  });

  const handleSubmit = () => {
    if (!user || !wizard.validateAll() || submitMutation.isPending) return;
    submitMutation.mutate();
  };

  return (
    <CauseWizard
      title="Create a campaign"
      stepMeta={createCauseStepMeta}
      currentStep={currentStep}
      onStepSelect={wizard.setCurrentStep}
      onBack={wizard.prevStep}
      onNext={wizard.nextStep}
      onSubmit={handleSubmit}
      submitLabel="Send for review"
      busyLabel="Sending…"
      busy={submitMutation.isPending}
      submitError={submitMutation.error?.message}
      onSaveAndExit={() => {
        saveDraft();
        router.push("/dashboard/causes");
      }}
      draftHasFiles={Boolean(form.coverImage || form.multimedia.length)}
    >
      {currentStep === 1 && (
        <CauseBasicsStep
          mode="create"
          form={form}
          errors={errors}
          setFormFields={setFormFields}
        />
      )}
      {currentStep === 2 && <CauseStoryStep {...wizard} />}
      {currentStep === 3 && <CauseTimelineStep {...wizard} />}
      {currentStep === 4 && (
        <CauseMediaStep
          form={form}
          errors={errors}
          setFormFields={setFormFields}
          onCoverUpload={wizard.uploadCover}
          onCoverRemove={wizard.clearCover}
          onGalleryUpload={wizard.uploadGallery}
          onGalleryRemove={wizard.removeMedia}
        />
      )}
      {currentStep === 5 && (
        <CauseReviewStep
          form={form}
          onEdit={wizard.setCurrentStep}
          busy={submitMutation.isPending}
        />
      )}
    </CauseWizard>
  );
}
