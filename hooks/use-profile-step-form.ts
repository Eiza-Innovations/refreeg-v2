"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import { useValidator } from "@/hooks/use-validator";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
import { uploadFileWithPresign } from "@/lib/s3/upload-client";
import {
  onboardingProfileSchema,
  type OnboardingProfileFields,
} from "@/lib/schemas/onboarding-profile.schema";
import { suggestUsername } from "@/utils/username";
import type { Step3Props } from "@/types/onboarding-types";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const DISALLOWED_IMAGE_TYPES = new Set(["image/svg+xml"]);

/** Form state, validation, direct S3 photo upload and username check for the profile step. */
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
  const persistedPhoto =
    saved.profilePhoto && !saved.profilePhoto.startsWith("blob:")
      ? saved.profilePhoto
      : "";
  const initialKey = isOwnUploadKey(persistedPhoto, "profiles", user.id)
    ? persistedPhoto
    : null;
  const fallbackPhotoUrl = persistedPhoto || user.image || null;

  const [form, setForm] = useState({
    firstName: saved.firstName || nameFirst,
    lastName: saved.lastName || nameRest.join(" "),
    username: saved.username || suggestUsername(user.email, user.name),
    location: saved.location,
    phone: saved.phone,
    consent: onboardingData.consent,
  });
  const [uploadedPhotoKey, setUploadedPhotoKey] = useState<string | null>(
    initialKey,
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(fallbackPhotoUrl);
  const [photoError, setPhotoError] = useState<string>();
  const blobUrlRef = useRef<string | null>(null);

  const setPreviewBlobUrl = (nextBlobUrl: string | null) => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    blobUrlRef.current = nextBlobUrl;
  };

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const usernameStatus = useUsernameAvailability(form.username, user.id);
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: onboardingProfileSchema,
  });

  // Upload directly to S3 via presigned PUT so the Server Action POST stays under CloudFront WAF's 8 KB limit.
  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      const { compressImage } = await import("@/utils/image-compression");
      const compressed = await compressImage(file, 800, 0.8);
      const previewUrl = URL.createObjectURL(compressed);
      setPreviewBlobUrl(previewUrl);
      setPhotoUrl(previewUrl);

      const { key } = await uploadFileWithPresign(compressed, {
        entityType: "profiles",
        entityId: user.id,
        mediaType: "images",
      });
      return key;
    },
    onSuccess: (key) => {
      setUploadedPhotoKey(key);
      setPhotoError(undefined);
      const { consent: _consent, ...profile } = form;
      updateOnboardingData("profile", {
        ...saved,
        ...profile,
        profilePhoto: key,
      });
    },
    onError: (error: Error) => {
      setPreviewBlobUrl(null);
      setPhotoUrl(uploadedPhotoKey || fallbackPhotoUrl);
      setPhotoError(error.message);
    },
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
      updateOnboardingData("profile", {
        ...saved,
        ...profile,
        ...(uploadedPhotoKey ? { profilePhoto: uploadedPhotoKey } : {}),
      });
    }
  };

  const pickPhoto = (file: File) => {
    if (uploadPhoto.isPending) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("File size must be less than 5MB");
      return;
    }
    if (
      !file.type.startsWith("image/") ||
      DISALLOWED_IMAGE_TYPES.has(file.type)
    ) {
      setPhotoError("Please select an image file");
      return;
    }
    setPhotoError(undefined);
    uploadPhoto.mutate(file);
  };

  const submit = () => {
    const valid = validate();
    if (uploadPhoto.isPending) return;
    const hasPhoto = Boolean(uploadedPhotoKey || fallbackPhotoUrl);
    if (!hasPhoto) {
      setPhotoError((current) => current ?? "Profile photo is required");
    } else {
      setPhotoError(undefined);
    }
    if (!valid || !hasPhoto || usernameStatus !== "available") {
      return;
    }
    const { consent: _consent, ...profile } = form;
    onNext({
      ...profile,
      email: user.email ?? "",
      profilePhoto: uploadedPhotoKey,
    });
  };

  return {
    form,
    setFormFields,
    errors: { ...errors, username: usernameError },
    usernameStatus,
    photoUrl,
    photoError,
    isUploadingPhoto: uploadPhoto.isPending,
    pickPhoto,
    submit,
  };
}
