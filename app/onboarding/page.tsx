"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const Step1 = dynamic(() => import("./step1"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step2 = dynamic(() => import("./step2"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step3 = dynamic(() => import("./step3"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const OrganizationDetailsStep = dynamic(() => import("./step3b-org-setup"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const CsrSetupStep = dynamic(() => import("./step-csr-setup"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const ChecklistStep = dynamic(() => import("./step-checklist"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step4 = dynamic(() => import("./step4"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const Step5 = dynamic(() => import("./step5"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const StepInterests = dynamic(() => import("./step-interests"), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
import NavigationLoader from "@/components/layout/NavigationLoader";
import OnboardingNav from "./onboardingNav";
import {
  hasCompletedOnboarding,
  createOnboardingProfile,
  getCurrentOnboardingStep,
  getOnboardingData,
  saveStep1Progress,
  saveStep2Progress,
  completeOnboarding,
} from "@/actions/users/profile-actions";
import { toast } from "@/hooks/use-toast";

type StepId =
  | "account-type"
  | "gender"
  | "profile"
  | "org-details"
  | "csr-setup"
  | "checklist"
  | "kyc"
  | "interests"
  | "complete";

const INDIVIDUAL_STEPS: StepId[] = [
  "account-type",
  "gender",
  "profile",
  "kyc",
  "interests",
  "complete",
];

function organizationSteps(purpose: string): StepId[] {
  // CSR setup only applies when the organisation gives as a company.
  return purpose === "fundraising"
    ? ["account-type", "org-details", "checklist"]
    : ["account-type", "org-details", "csr-setup", "checklist"];
}

function dbStepToStepId(dbStep: number, accountType: string): StepId {
  if (accountType === "organization") {
    if (dbStep < 3.6) return "org-details";
    if (dbStep < 3.7) return "csr-setup";
    return "checklist";
  }
  if (dbStep <= 1) return "account-type";
  if (dbStep === 2) return "gender";
  if (dbStep === 3) return "profile";
  return "kyc";
}

export default function OnboardingPage() {
  const [currentStepId, setCurrentStepId] = useState<StepId>("account-type");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [direction, setDirection] = useState(1);

  const [onboardingData, setOnboardingData] = useState({
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
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const completionDestinationRef = useRef<string | null>(null);

  const isOrg = onboardingData.accountType === "organization";
  const stepSequence = useMemo(
    () =>
      isOrg
        ? organizationSteps(onboardingData.organizationPurpose)
        : INDIVIDUAL_STEPS,
    [isOrg, onboardingData.organizationPurpose],
  );

  const currentStepIndex = stepSequence.indexOf(currentStepId);
  const totalSteps = stepSequence.length;

  const goToStep = (stepId: StepId, dir: 1 | -1 = 1) => {
    setDirection(dir);
    setCurrentStepId(stepId);
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < totalSteps) {
      goToStep(stepSequence[nextIndex], 1);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      goToStep(stepSequence[prevIndex], -1);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      if (status === "loading") return;

      if (status === "unauthenticated" || !session?.user) {
        router.push("/auth/signin");
        return;
      }

      const currentUser = session.user;

      const isCompletedInSession = (currentUser as any).onboardingCompleted;

      if (isCompletedInSession === true) {
        if (completionDestinationRef.current) return;
        router.push("/dashboard");
        return;
      }

      const hasCompleted = await hasCompletedOnboarding(
        currentUser.id as string,
      );
      if (hasCompleted) {
        if (isCompletedInSession === false) {
          await update({ onboardingCompleted: true });
        }
        router.push("/dashboard");
        return;
      }

      setUser(currentUser);

      if (isLoading) {
        try {
          const [currentStepFromDB, existingData] = await Promise.all([
            getCurrentOnboardingStep(currentUser.id as string),
            getOnboardingData(currentUser.id as string),
          ]);

          const accountType = existingData.accountType || "";

          let firstName = existingData.profile.firstName || "";
          let lastName = existingData.profile.lastName || "";

          if (!firstName && !lastName && currentUser.name) {
            const nameParts = currentUser.name.split(" ");
            firstName = nameParts[0] || "";
            lastName = nameParts.slice(1).join(" ") || "";
          }

          setOnboardingData((prev) => ({
            ...prev,
            accountType,
            organizationPurpose: existingData.organizationPurpose || "",
            gender: existingData.gender,
            profile: {
              ...prev.profile,
              ...existingData.profile,
              firstName: firstName,
              lastName: lastName,
              profilePhoto:
                existingData.profile.profilePhoto || currentUser.image || "",
            },
          }));

          const resumeStepId = dbStepToStepId(currentStepFromDB, accountType);
          setCurrentStepId(resumeStepId);

          setIsLoading(false);
        } catch (error) {
          console.error("Error loading onboarding progress:", error);
          setCurrentStepId("account-type");
          setIsLoading(false);
        }
      }
    };

    checkUser();
  }, [router, session, status, isLoading, update]);

  useEffect(() => {
    if (!user) return;
    // Individuals only: the org wizard derives the owner profile server-side
    // on the organisation details step, so there is nothing to guard here.
    if (onboardingData.accountType === "organization") return;

    const lateSteps: StepId[] = ["kyc", "interests", "complete"];
    if (!lateSteps.includes(currentStepId)) return;

    const profileData = onboardingData.profile;
    const isProfileComplete = !!(
      profileData?.firstName &&
      profileData?.lastName &&
      profileData?.username &&
      profileData?.location &&
      profileData?.phone
    );

    if (!isProfileComplete) {
      setCurrentStepId("account-type");
      toast({
        title: "Complete your profile first",
        description: "Please complete earlier steps before proceeding.",
        variant: "destructive",
      });
    }
  }, [user, currentStepId, onboardingData.profile, onboardingData.accountType]);

  const handleStep1Next = async (
    accountType: "individual" | "organization",
    meta: { organizationPurpose?: string } = {},
  ) => {
    try {
      await saveStep1Progress(user.id, accountType, meta);
      updateOnboardingData("accountType", accountType);
      if (meta.organizationPurpose) {
        updateOnboardingData("organizationPurpose", meta.organizationPurpose);
      }

      setDirection(1);
      setCurrentStepId(
        accountType === "organization" ? "org-details" : "gender",
      );
    } catch (error) {
      console.error("Error saving step 1 progress:", error);
      toast({
        title: "Error saving progress",
        description: "Failed to save your account type. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStep2Next = async (gender: string) => {
    try {
      await saveStep2Progress(user.id, gender);
      updateOnboardingData("gender", gender);
      goToStep("profile", 1);
    } catch (error) {
      console.error("Error saving step 2 progress:", error);
      toast({
        title: "Error saving progress",
        description: "Failed to save your gender. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStep3Submit = async (profileData: any) => {
    setIsSubmitting(true);
    try {
      await createOnboardingProfile(
        user.id,
        {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          username: profileData.username,
          location: profileData.location,
          phone: profileData.phone,
          email: user.email || "",
          profilePhoto: profileData.profilePhoto,
          accountType: onboardingData.accountType || "individual",
          gender: onboardingData.gender || undefined,
        },
        user.image,
      );

      goToStep("kyc", 1);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Error creating profile",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (destination?: string) => {
    const requestedRedirect = searchParams.get("redirect");
    const safeRedirect =
      requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
        ? requestedRedirect
        : null;
    const target = destination || safeRedirect || "/dashboard";

    completionDestinationRef.current = target;
    setIsSubmitting(true);

    try {
      await completeOnboarding(user.id);
      await update({ onboardingCompleted: true });

      localStorage.removeItem("onboarding_account_type");
      localStorage.removeItem("onboarding_organizationPurpose");
      localStorage.removeItem("onboarding_gender");
      localStorage.removeItem("onboarding_profile");
      localStorage.removeItem("onboarding_interests");
      localStorage.removeItem("onboarding_kyc_completed");
      localStorage.removeItem("onboarding_consent");

      window.location.assign(target);
    } catch (error) {
      completionDestinationRef.current = null;
      setIsSubmitting(false);
      toast({
        title: "Could not complete onboarding",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKycSkipOrSubmit = async () => {
    goToStep("interests", 1);
  };

  const handleKyc = async () => {
    await handleComplete("/dashboard/settings/kyc-setup");
  };

  const updateOnboardingData = (key: string, value: any) => {
    setOnboardingData((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem(
      `onboarding_${key}`,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  };

  // ──── Render ────────────────────────────────────────────────────────

  if (isLoading) {
    return <NavigationLoader />;
  }

  if (!user) {
    return null;
  }

  const stepVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  const stepContent = (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={currentStepId}
        custom={direction}
        variants={stepVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        className="w-full"
      >
        {currentStepId === "account-type" && (
          <Step1
            user={user}
            onNext={handleStep1Next}
            onboardingData={onboardingData}
          />
        )}
        {currentStepId === "gender" && (
          <Step2
            user={user}
            onNext={handleStep2Next}
            onBack={goBack}
            onboardingData={onboardingData}
            updateOnboardingData={updateOnboardingData}
          />
        )}
        {currentStepId === "profile" && (
          <Step3
            user={user}
            onNext={handleStep3Submit}
            onBack={goBack}
            onboardingData={onboardingData}
            updateOnboardingData={updateOnboardingData}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStepId === "org-details" && (
          <OrganizationDetailsStep
            user={user}
            onNext={goNext}
            onBack={goBack}
            onboardingData={onboardingData}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStepId === "csr-setup" && (
          <CsrSetupStep
            user={user}
            onNext={goNext}
            onBack={goBack}
            onboardingData={onboardingData}
          />
        )}
        {currentStepId === "checklist" && (
          <ChecklistStep
            user={user}
            onComplete={handleComplete}
            onboardingData={onboardingData}
          />
        )}
        {currentStepId === "kyc" && (
          <Step4
            user={user}
            onNext={handleKycSkipOrSubmit}
            onKyc={handleKyc}
            onBack={goBack}
            onboardingData={onboardingData}
            updateOnboardingData={updateOnboardingData}
          />
        )}
        {currentStepId === "interests" && (
          <StepInterests
            user={user}
            onNext={goNext}
            onBack={goBack}
            onboardingData={onboardingData}
            updateOnboardingData={updateOnboardingData}
          />
        )}
        {currentStepId === "complete" && (
          <Step5
            user={user}
            onComplete={handleComplete}
            onboardingData={onboardingData}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );

  if (isOrg) {
    return (
      <div className="min-h-screen w-full bg-cream">
        <header className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-5 sm:gap-6 sm:px-6">
          <p className="shrink-0 text-sm font-semibold text-ink">
            Step {currentStepIndex + 1} of {totalSteps}
          </p>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-cream-muted">
            <div
              className="h-full rounded-full bg-blue-accent transition-all duration-300"
              style={{
                width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
              }}
            />
          </div>
          <Link
            href="/faq"
            className="shrink-0 text-sm text-ink/60 transition-colors hover:text-ink"
          >
            Need help?
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden">{stepContent}</div>
        </main>
      </div>
    );
  }

  // Progress bar: how many segments are "filled"
  const filledSteps = currentStepIndex + 1;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-start bg-white">
      <OnboardingNav
        currentStep={currentStepIndex + 1}
        onBack={goBack}
        showUserNav={
          currentStepId === "kyc" ||
          currentStepId === "interests" ||
          currentStepId === "complete"
        }
      />
      <div className="flex w-full flex-1 flex-col items-center justify-center px-8 py-12">
        <div className="mb-8 flex justify-center space-x-2">
          {[...Array(totalSteps)].map((_, i) => (
            <div
              key={i}
              className={`h-2 w-12 rounded-full transition-colors duration-300 ${
                i < filledSteps ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <div className="relative overflow-hidden">{stepContent}</div>
      </div>
    </div>
  );
}
