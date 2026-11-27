"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useSession } from "next-auth/react";
import {
  completeOnboarding,
  createOnboardingProfile,
  getOnboardingProgress,
  saveStep1Progress,
  saveStep2Progress,
} from "@/actions/users/profile-actions";
import { toast } from "@/hooks/use-toast";
import { safeRedirect } from "@/lib/auth/safe-redirect";
import { hardNavigate } from "@/lib/hard-navigate";
import {
  clearOnboardingStorage,
  hasConfirmedStep1,
  markStep1Confirmed,
  saveOnboardingAnswer,
} from "@/lib/onboarding/storage";
import {
  individualSteps,
  organizationSteps,
  resumeStepId,
} from "@/lib/onboarding/steps";
import type {
  OnboardingData,
  OnboardingUser,
  ProfileSubmission,
  StepId,
  UpdateOnboardingData,
} from "@/types/onboarding-types";

const emptyOnboardingData: OnboardingData = {
  accountType: "",
  organizationPurpose: "",
  gender: "",
  profile: {
    firstName: "",
    lastName: "",
    username: "",
    bio: "",
    location: "",
    website: "",
    phone: "",
  },
  interests: [],
  kycCompleted: false,
  consent: false,
};

/** Step state, resume-from-database, saving and completion for the onboarding wizard. */
export function useOnboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const completionDestinationRef = useRef<string | null>(null);

  const [currentStepId, setCurrentStepId] = useState<StepId>("account-type");
  const [user, setUser] = useState<OnboardingUser | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [onboardingData, setOnboardingData] =
    useState<OnboardingData>(emptyOnboardingData);

  const isOrg = onboardingData.accountType === "organization";
  const stepSequence = useMemo(
    () =>
      isOrg
        ? organizationSteps(onboardingData.organizationPurpose)
        : individualSteps,
    [isOrg, onboardingData.organizationPurpose],
  );
  const currentStepIndex = stepSequence.indexOf(currentStepId);
  const totalSteps = stepSequence.length;

  const goToStep = (stepId: StepId, dir: 1 | -1 = 1) => {
    setDirection(dir);
    setCurrentStepId(stepId);
  };

  const goNext = () => {
    if (currentStepIndex + 1 < totalSteps) {
      goToStep(stepSequence[currentStepIndex + 1], 1);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) goToStep(stepSequence[currentStepIndex - 1], -1);
  };

  const updateOnboardingData: UpdateOnboardingData = (key, value) => {
    setOnboardingData((prev) => ({ ...prev, [key]: value }));
    saveOnboardingAnswer(
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  };

  const sessionUser = status === "authenticated" ? session?.user : undefined;
  const completedInSession = sessionUser?.onboardingCompleted;

  // Where this person left off, or that they are already finished.
  const progress = useQuery({
    queryKey: ["onboarding-progress", sessionUser?.id],
    enabled: !!sessionUser && completedInSession !== true,
    refetchOnWindowFocus: false,
    queryFn: () => getOnboardingProgress(sessionUser!.id),
  });

  // Sends signed-out and finished people elsewhere.
  useEffect(() => {
    if (status === "loading") return;
    if (!sessionUser) {
      router.push("/auth/signin");
      return;
    }
    if (completedInSession === true) {
      if (!completionDestinationRef.current) router.push("/dashboard");
      return;
    }
    if (progress.data?.completed) {
      if (completedInSession === false) update({ onboardingCompleted: true });
      router.push("/dashboard");
    }
  }, [status, sessionUser, completedInSession, progress.data, router, update]);

  // Starts the wizard on the saved step, once.
  useEffect(() => {
    if (!sessionUser || user) return;
    // On failure stay here and let the page offer a retry. Starting at step 1
    // would put someone half way through back at the account-type choice.
    if (!progress.data || progress.data.completed) return;

    const { step, data: existing } = progress.data;
    const accountType = existing.accountType || "";
    let { firstName, lastName } = existing.profile;
    if (!firstName && !lastName && sessionUser.name) {
      const [first, ...rest] = sessionUser.name.split(" ");
      firstName = first || "";
      lastName = rest.join(" ");
    }

    setOnboardingData((prev) => ({
      ...prev,
      accountType,
      organizationPurpose: existing.organizationPurpose || "",
      gender: existing.gender,
      profile: {
        ...prev.profile,
        ...existing.profile,
        firstName,
        lastName,
        profilePhoto: existing.profile.profilePhoto || sessionUser.image || "",
      },
    }));
    setCurrentStepId(
      resumeStepId({
        dbStep: step,
        accountType,
        organizationPurpose: existing.organizationPurpose || "",
        step1Confirmed: hasConfirmedStep1(),
      }),
    );
    setUser(sessionUser);
  }, [sessionUser, user, progress.data]);

  // Individuals cannot reach the later steps without a complete profile.
  useEffect(() => {
    if (!user || isOrg) return;
    if (!["kyc", "interests", "complete"].includes(currentStepId)) return;

    const { firstName, lastName, username, location, phone } =
      onboardingData.profile;
    if (firstName && lastName && username && location && phone) return;

    setCurrentStepId("account-type");
    toast({
      title: "Complete your profile first",
      description: "Please complete earlier steps before proceeding.",
      variant: "destructive",
    });
  }, [user, isOrg, currentStepId, onboardingData.profile]);

  const showSaveError = (title: string) => (error: Error) =>
    toast({ title, description: error.message, variant: "destructive" });

  const accountTypeStep = useMutation({
    mutationFn: async (input: {
      accountType: "individual" | "organization";
      meta: { organizationPurpose?: string };
    }) => {
      await saveStep1Progress(user!.id, input.accountType, input.meta);
      return input;
    },
    onSuccess: ({ accountType, meta }) => {
      markStep1Confirmed();
      updateOnboardingData("accountType", accountType);
      if (meta.organizationPurpose) {
        updateOnboardingData("organizationPurpose", meta.organizationPurpose);
      }
      goToStep(accountType === "organization" ? "org-details" : "gender");
    },
    onError: showSaveError("Error saving progress"),
  });

  const genderStep = useMutation({
    mutationFn: async (gender: string) => {
      await saveStep2Progress(user!.id, gender);
      return gender;
    },
    onSuccess: (gender) => {
      updateOnboardingData("gender", gender);
      goToStep("profile");
    },
    onError: showSaveError("Error saving progress"),
  });

  const profileStep = useMutation({
    mutationFn: (profile: ProfileSubmission) =>
      createOnboardingProfile(
        user!.id,
        {
          ...profile,
          email: user!.email || "",
          accountType: onboardingData.accountType || "individual",
          gender: onboardingData.gender || undefined,
        },
        user!.image,
      ),
    onSuccess: (saved, submitted) => {
      updateOnboardingData("profile", {
        ...onboardingData.profile,
        firstName: submitted.firstName,
        lastName: submitted.lastName,
        username: submitted.username,
        location: submitted.location,
        phone: submitted.phone,
        profilePhoto:
          saved?.profilePhoto ||
          submitted.profilePhoto ||
          onboardingData.profile.profilePhoto ||
          user?.image ||
          "",
      });
      goToStep("kyc");
    },
    onError: showSaveError("Error creating profile"),
  });

  const completion = useMutation({
    mutationFn: async (target: string) => {
      completionDestinationRef.current = target;
      await completeOnboarding(user!.id);
      await update({ onboardingCompleted: true });
      clearOnboardingStorage();
      hardNavigate(target);
    },
    onError: (error) => {
      completionDestinationRef.current = null;
      showSaveError("Could not complete onboarding")(error);
    },
  });

  const handleComplete = (destination?: string) => {
    if (!user || completion.isPending) return;
    completion.mutate(
      destination || safeRedirect(searchParams.get("redirect")) || "/dashboard",
    );
  };

  return {
    user,
    isLoading: !user && !progress.isError,
    loadError: progress.isError
      ? progress.error instanceof Error
        ? progress.error.message
        : "Something went wrong."
      : null,
    retryLoad: () => progress.refetch(),
    isSubmitting: profileStep.isPending || completion.isPending,
    isOrg,
    currentStepId,
    currentStepIndex,
    totalSteps,
    direction,
    onboardingData,
    updateOnboardingData,
    goNext,
    goBack,
    goToStep,
    handleStep1Next: (
      accountType: "individual" | "organization",
      meta: { organizationPurpose?: string } = {},
    ) => user && accountTypeStep.mutate({ accountType, meta }),
    handleStep2Next: (gender: string) => user && genderStep.mutate(gender),
    handleProfileSubmit: (profile: ProfileSubmission) =>
      user && profileStep.mutate(profile),
    handleComplete,
    handleKyc: () => handleComplete("/dashboard/settings/kyc-setup"),
  };
}
