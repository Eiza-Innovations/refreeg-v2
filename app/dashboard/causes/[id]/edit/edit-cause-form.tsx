"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { useAuth } from "@/hooks/use-auth";
import { updateCause } from "@/actions/causes/cause-actions";
import { useCauseForm } from "@/hooks/use-cause-form";
import { endDateFromDaysActive } from "@/lib/duration";
import { editCauseStepMeta } from "@/lib/options/cause.options";
import type { CauseFormValues } from "@/lib/schemas/cause.schema";
import {
  resolveMultimediaForSubmit,
  uploadFileWithPresign,
} from "@/lib/s3/upload-client";
import { sendCauseEditedEmail } from "@/services/mail";
import type { Cause } from "@/types";
import { CauseBasicsStep } from "../../_components/basics-step";
import { CauseMediaStep } from "../../_components/media-step";
import { CauseReviewStep } from "../../_components/review-step";
import { CauseStoryStep } from "../../_components/story-step";
import { CauseTimelineStep } from "../../_components/timeline-step";
import { CauseWizard } from "../../_components/cause-wizard";

type EditCauseFormProps = {
  cause: Cause & {
    startDate?: string;
    endDate?: string;
  };
};

const initialValues = (cause: Cause): CauseFormValues => ({
  title: cause.title,
  summary: cause.summary || "",
  location: cause.location || "",
  category: cause.category,
  goal: cause.goal.toString(),
  currency: "NGN",
  coverImage: null,
  image: cause.image || "",
  sections: cause.sections || [{ heading: "", description: "" }],
  startDate: new Date(),
  endDate: endDateFromDaysActive(cause.days_active),
  multimedia: cause.multimedia || [],
  videoLinks: cause.video_links || [],
});

export default function EditCauseForm({ cause }: EditCauseFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const wizard = useCauseForm({
    initialValues: initialValues(cause),
    mode: "edit",
  });
  const { form, errors, setFormFields, currentStep } = wizard;

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      let coverImage: File | string | null = form.coverImage;
      if (form.coverImage instanceof File) {
        const { key } = await uploadFileWithPresign(form.coverImage, {
          entityType: "causes",
          entityId: cause.id,
          mediaType: "images",
        });
        coverImage = key;
      }

      const multimedia = await resolveMultimediaForSubmit(form.multimedia, {
        entityType: "causes",
        entityId: cause.id,
      });

      await updateCause(cause.id, user.id, {
        title: form.title,
        summary: form.summary,
        location: form.location,
        category: form.category,
        goal: form.goal,
        coverImage,
        image: form.coverImage ? undefined : cause.image || undefined,
        sections: form.sections,
        startDate: form.startDate,
        endDate: form.endDate,
        multimedia,
        video_links: form.videoLinks,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["causes"] });
      sendCauseEditedEmail({
        causeName: form.title,
        reviewTimeframe: "3-5 business days",
        dashboardUrl: `${window.location.origin}/dashboard/causes`,
      }).catch((error) => {
        console.error("Failed to send cause-edited email:", error);
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
      title="Edit campaign"
      stepMeta={editCauseStepMeta}
      currentStep={currentStep}
      onStepSelect={wizard.setCurrentStep}
      onBack={wizard.prevStep}
      onNext={wizard.nextStep}
      onSubmit={handleSubmit}
      submitLabel="Send changes for review"
      busyLabel="Sending…"
      busy={submitMutation.isPending}
      submitError={submitMutation.error?.message}
      submitCalloutTitle="Send changes for review"
      submitCalloutDescription="RefreeG reviews edits before they appear publicly."
    >
      {currentStep === 1 && (
        <CauseBasicsStep
          mode="edit"
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
