"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading, P } from "@/components/marketing/Typography";
import { Icons } from "@/components/layout/Icons";
import { useSignature } from "@/hooks/use-signature";
import { usePetitionSignForm } from "@/hooks/use-petition-sign-form";
import { sendPetitionSignedEmailToUser } from "@/services/mail";
import { ShareModal } from "@/components/engagement/ShareModal";
import { getBaseURL } from "@/lib/utils";
import { SignFormFields } from "@/components/petitions/SignFormFields";

interface SignatureFormProps {
  petitionId: string;
  profile: {
    email?: string;
    name?: string;
    id?: string;
  };
  status: "pending" | "rejected" | "approved" | "expired";
  petitionTitle: string;
  hasSigned: boolean;
}

export function SignatureForm({
  petitionId,
  profile,
  status,
  petitionTitle,
  hasSigned,
}: SignatureFormProps) {
  const { createUserSignature, isLoading } = useSignature();
  const { form, setFormFields, errors, validate } = usePetitionSignForm({
    name: profile?.name,
    email: profile?.email,
  });
  const baseUrl = getBaseURL();

  const isFormDisabled = hasSigned || status !== "approved";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isFormDisabled || !validate()) return;

    // The hook shows the server's error as a toast.
    const signed = await createUserSignature(petitionId, profile?.id || null, {
      amount: 1,
      ...form,
    });
    if (!signed) return;

    try {
      await sendPetitionSignedEmailToUser(
        form.email,
        form.isAnonymous ? "Supporter" : form.name,
        petitionTitle,
        `${window.location.origin}/petitions/${petitionId}`,
        form.isAnonymous,
      );
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }
  };

  return (
    <Card variant="surface" className="p-6">
      <Eyebrow>Add your name</Eyebrow>
      <Heading as="h2" size="panel" className="mt-2">
        {hasSigned ? "Thank you for signing" : "Sign this petition"}
      </Heading>
      <P className="mt-1 text-ink/60 md:text-sm">
        {hasSigned
          ? "Share it to help reach the goal."
          : "Signing is free and takes a few seconds."}
      </P>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {hasSigned && (
          <CalloutBanner
            variant="lime"
            title="You've already signed this petition"
          />
        )}

        <SignFormFields
          form={form}
          errors={errors}
          setFormFields={setFormFields}
          idPrefix="petition-sign"
          disabled={isFormDisabled}
        />

        {hasSigned ? (
          <ShareModal
            url={`${baseUrl}/petitions/${petitionId}`}
            title={petitionTitle}
            entityId={petitionId}
            entityType="petition"
            triggerVariant="surface"
          />
        ) : (
          <Button
            type="submit"
            variant="lime"
            disabled={isLoading || isFormDisabled}
            className="h-11 w-full rounded-xl"
          >
            {isLoading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Signing...
              </>
            ) : (
              "Sign this petition"
            )}
          </Button>
        )}
      </form>
    </Card>
  );
}
