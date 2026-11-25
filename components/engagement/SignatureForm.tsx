"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/marketing/Typography";
import { Switch } from "@/components/ui/switch";
import { Icons } from "@/components/layout/Icons";
import { useAuth } from "@/hooks/use-auth";
import { useSignature } from "@/hooks/use-signature";
import { useProfile } from "@/hooks/use-profile";
import { sendPetitionSignedEmailToUser } from "@/services/mail";
import { ShareModal } from "@/components/engagement/ShareModal";
import { cn, getBaseURL } from "@/lib/utils";
import { fieldClass } from "@/components/petitions/field-styles";

interface SignatureFormProps {
  petitionId: string;
  profile: {
    email?: string;
    name?: string;
    id?: string;
  };
  subaccount?: string;
  status: "pending" | "rejected" | "approved" | "expired";
  petitionData?: {
    title?: string;
    creatorId?: string;
    creatorEmail?: string | null;
    creatorName?: string;
  };
  hasSigned: boolean;
  onSuccess?: () => void;
}

export function SignatureForm({
  petitionId,
  profile,
  status,
  subaccount,
  petitionData = {},
  hasSigned,
  onSuccess,
}: SignatureFormProps) {
  const { createUserSignature, isLoading } = useSignature();
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    email: profile?.email || "",
    message: "",
    isAnonymous: false,
  });

  const baseUrl = getBaseURL();

  const isFormDisabled =
    hasSigned ||
    status === "pending" ||
    status === "rejected" ||
    status === "expired";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (isFormDisabled) return;

    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    if (isFormDisabled) return;
    setFormData((prev) => ({ ...prev, isAnonymous: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasSigned) {
      setFriendlyError("You have already signed this petition.");
      return;
    }

    try {
      const ok = await createUserSignature(
        petitionId,
        profile?.id && profile.id !== "" ? profile.id : null,
        {
          amount: 1,
          email: formData.email,
          name: formData.name,
          message: formData.message,
          isAnonymous: formData.isAnonymous,
        },
      );

      if (!ok) {
        setFriendlyError(
          "We couldn't process your signature. Please try again.",
        );
        return;
      }

      setFriendlyError(null);

      if (onSuccess) {
        onSuccess();
      }

      try {
        await sendPetitionSignedEmailToUser(
          formData.email,
          formData.isAnonymous ? "Supporter" : formData.name,
          petitionData.title || "the petition",
          `${window.location.origin}/petitions/${petitionId}`,
          formData.isAnonymous,
        );
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }

      // Note: Notification to petition creator is now handled in the backend
      // when the petition goal is reached, not on every signature
    } catch (error) {
      console.error("Error submitting signature:", error);
      setFriendlyError("We couldn't process your signature. Please try again.");
    }
  };

  const disabledClass = isFormDisabled
    ? "cursor-not-allowed bg-cream-muted"
    : "";

  return (
    <Card variant="surface" className="p-6">
      <Eyebrow>Add your name</Eyebrow>
      <Heading as="h2" size="subsection" className="mt-2 text-2xl md:text-2xl">
        {hasSigned ? "Thank you for signing" : "Sign this petition"}
      </Heading>
      <p className="mt-1 text-sm text-ink/60">
        {hasSigned
          ? "Share it to help reach the goal."
          : "Signing is free and takes a few seconds."}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {hasSigned && (
          <CalloutBanner
            variant="lime"
            title="You've already signed this petition"
          />
        )}
        {friendlyError && (
          <CalloutBanner variant="rust" title={friendlyError} />
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Enter your name"
            value={formData.name}
            onChange={handleChange}
            required={!formData.isAnonymous}
            disabled={formData.isAnonymous || isFormDisabled}
            className={cn(fieldClass, disabledClass)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isFormDisabled}
            className={cn(fieldClass, disabledClass)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message (optional)</Label>
          <Textarea
            id="message"
            name="message"
            placeholder="Leave a message of support"
            value={formData.message}
            onChange={handleChange}
            disabled={isFormDisabled}
            className={cn(fieldClass, disabledClass)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="anonymous"
            checked={formData.isAnonymous}
            onCheckedChange={handleSwitchChange}
            disabled={isFormDisabled}
          />
          <Label
            htmlFor="anonymous"
            className={isFormDisabled ? "text-ink/40" : ""}
          >
            Sign anonymously
          </Label>
        </div>

        {hasSigned ? (
          <ShareModal
            url={`${baseUrl}/petitions/${petitionId}`}
            title={petitionData.title || "Petition"}
            entityId={petitionId}
            entityType="petition"
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
