"use client";

import { useState } from "react";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import { useValidator } from "@/hooks/use-validator";
import {
  onboardingProfileSchema,
  type OnboardingProfileFields,
} from "@/lib/schemas/onboarding-profile.schema";
import { suggestUsername } from "@/utils/username";
import type { Step3Props } from "@/types/onboarding-types";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Form state, validation, photo upload and username check for the profile step. */
export function useProfileStepForm({
  user,
  onboardingData,
  updateOnboardingData,
  onNext,
}: Pick<
  Step3Props,
  "user" | "onboardingData" | "updateOnboardingData" | "onNext"
>) {
  const saved = onboardingData.profile;
  const [nameFirst = "", ...nameRest] = (user.name ?? "").split(" ");

  const [form, setForm] = useState({
    firstName: saved.firstName || nameFirst,
    lastName: saved.lastName || nameRest.join(" "),
    username: saved.username || suggestUsername(user.email, user.name),
    location: saved.location,
    phone: saved.phone,
    consent: onboardingData.consent,
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    saved.profilePhoto || user.image || null,
  );
  const [photoError, setPhotoError] = useState<string>();

  const usernameStatus = useUsernameAvailability(form.username, user.id);
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: onboardingProfileSchema,
  });

  // Characters that can never be saved are flagged as they are typed; a
  // too-short handle is only reported on submit so the first keystroke is not an error.
  const badCharacters =
    form.username.trim().length > 0 &&
    /[^a-zA-Z0-9_]/.test(form.username.trim());
  const usernameError =
    errors.username ??
    (badCharacters
      ? "Username can only contain letters, numbers, and underscores"
      : undefined) ??
    (usernameStatus === "taken" ? "Username is already taken" : undefined);

  const setFormFields = <K extends keyof OnboardingProfileFields>(
    key: K,
    value: OnboardingProfileFields[K],
  ) => {
    const next = { ...form, [key]: value };
    setForm(next);
    clearError(key);
    if (key === "consent") {
      updateOnboardingData("consent", value as boolean);
    } else {
      const { consent: _consent, ...profile } = next;
      updateOnboardingData("profile", { ...saved, ...profile });
    }
  };

  const pickPhoto = async (file: File) => {
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("File size must be less than 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file");
      return;
    }
    try {
      const { compressImage } = await import("@/utils/image-compression");
      const compressed = await compressImage(file, 800, 0.8);
      const url = URL.createObjectURL(compressed);
      setPhoto(compressed);
      setPhotoUrl(url);
      setPhotoError(undefined);
      updateOnboardingData("profile", { ...saved, profilePhoto: url });
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : "Error processing the image",
      );
    }
  };

  const submit = () => {
    const valid = validate();
    const missingPhoto = !photo && !photoUrl;
    setPhotoError(missingPhoto ? "Profile photo is required" : undefined);
    if (!valid || missingPhoto || usernameStatus !== "available") {
      return;
    }
    const { consent: _consent, ...profile } = form;
    onNext({ ...profile, email: user.email ?? "", profilePhoto: photo });
  };

  return {
    form,
    setFormFields,
    errors: { ...errors, username: usernameError },
    usernameStatus,
    photoUrl,
    photoError,
    pickPhoto,
    submit,
  };
}
