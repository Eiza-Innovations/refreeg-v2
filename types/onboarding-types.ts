import type { LucideIcon } from "lucide-react";
import type { Session } from "next-auth";
import type { ComponentType, ReactNode } from "react";
import type { useOnboarding } from "@/hooks/use-onboarding";
import type { OnboardingProfileData } from "@/types/profile-types";

export type StepId =
  | "account-type"
  | "gender"
  | "profile"
  | "org-details"
  | "csr-setup"
  | "checklist"
  | "kyc"
  | "interests"
  | "complete";

export type OnboardingUser = Session["user"];

export type OnboardingProfile = {
  firstName: string;
  lastName: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  phone: string;
  email?: string;
  profilePhoto?: string;
};

/** What the profile step hands back when the person continues. */
export type ProfileSubmission = Pick<
  OnboardingProfileData,
  "firstName" | "lastName" | "username" | "location" | "phone" | "email"
> & { profilePhoto: File | string | null };

export type OnboardingData = {
  accountType: string;
  organizationPurpose: string;
  gender: string;
  profile: OnboardingProfile;
  interests: string[];
  kycCompleted: boolean;
  consent: boolean;
};

export type UpdateOnboardingData = <K extends keyof OnboardingData>(
  key: K,
  value: OnboardingData[K],
) => void;

type StepBase = {
  user: OnboardingUser;
  onboardingData: OnboardingData;
};

export type Step1Props = StepBase & {
  onNext: (
    accountType: "individual" | "organization",
    meta?: { organizationPurpose?: string },
  ) => void;
};

export type Step2Props = StepBase & {
  onNext: (gender: string) => void;
  updateOnboardingData: UpdateOnboardingData;
};

export type Step3Props = StepBase & {
  onNext: (profile: ProfileSubmission) => void;
  updateOnboardingData: UpdateOnboardingData;
  isSubmitting: boolean;
};

export type Step4Props = StepBase & {
  onNext: () => void;
  onKyc: () => void | Promise<void>;
  updateOnboardingData: UpdateOnboardingData;
};

export type Step5Props = StepBase & {
  onComplete: (destination?: string) => void | Promise<void>;
};

export type StepInterestsProps = StepBase & {
  onNext: () => void;
  updateOnboardingData: UpdateOnboardingData;
};

export type ChecklistStepProps = StepBase & {
  onComplete: (destination?: string) => void | Promise<void>;
};

export type CsrSetupStepProps = StepBase & {
  onNext: () => void;
};

export type OrganizationDetailsStepProps = StepBase & {
  onNext: () => void;
  isSubmitting: boolean;
};

export type InviteRow = {
  email: string;
  role: string;
};

export type CsrForm = {
  csrBudget: string;
  csrFinancialYearStart: string;
  csrFocusCauses: string[];
  csrMatchEmployeeDonations: boolean;
  csrMatchCap: string;
  csrPublicReport: boolean;
  invites: InviteRow[];
};

export type OrgDetailsForm = {
  name: string;
  organisationType: string;
  registrationNumber: string;
  country: string;
  contactName: string;
  contactRole: string;
  adminEmail: string;
  phone: string;
  websiteUrl: string;
  username: string;
};

export type OnboardingState = ReturnType<typeof useOnboarding>;

export type OnboardingStepViewProps = {
  state: OnboardingState;
  user: OnboardingUser;
};

export type OnboardingShellProps = {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  showUserNav?: boolean;
  children: ReactNode;
};

export type ChoiceCardProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  active: boolean;
  onSelect: () => void;
};

export type UsernameStatus = "idle" | "checking" | "available" | "taken";

export type OnboardingFieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
};

export type ProfilePhotoPickerProps = {
  photoUrl: string | null;
  error?: string;
  onPick: (file: File) => void;
};

export type AccountTypeKey = "individual" | "organization";

export type ResumeStepInput = {
  dbStep: number;
  accountType: string;
  organizationPurpose: string;
  step1Confirmed: boolean;
};

export type InterestCardProps = {
  label: string;
  icon?: LucideIcon;
  /** Campaigns in this category; null when the count is unknown. */
  count: number | null;
  countsLoaded: boolean;
  selected: boolean;
  onToggle: () => void;
};
