import type { ReactNode } from "react";
import type { Input } from "@/components/ui/input";
import type { SignupAccountType } from "@/lib/auth/registration";

export type AuthChecklistItem = {
  title: string;
  description: string;
};

export type AuthTestimonial = {
  quote: string;
  author: string;
  avatarInitials: string;
};

export type AuthBottomCard = {
  eyebrow?: string;
  text: string;
};

export type AuthBrandPanelProps = {
  headline: string;
  subtitle: string;
  checklist?: AuthChecklistItem[];
  testimonial?: AuthTestimonial;
  bottomCard?: AuthBottomCard;
  className?: string;
};

export type AuthShellProps = {
  brand: AuthBrandPanelProps;
  children: ReactNode;
};

export type AuthFieldProps = Omit<React.ComponentProps<typeof Input>, "id"> & {
  id: string;
  label: string;
  error?: string;
  /** Shown opposite the label, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
};

export type AuthLogoProps = {
  className?: string;
  variant?: "white" | "dark";
  href?: string;
};

export type PasswordRequirementsProps = {
  password: string;
  className?: string;
};

export type AuthStepProgressProps = {
  step: number;
  total?: number;
  className?: string;
};

export type SocialSignInButtonsProps = {
  disabled: boolean;
  googleLoading: boolean;
  onGoogle: () => void;
};

export type AlreadySignedInCardProps = {
  name?: string | null;
  email?: string | null;
  redirectTo: string;
  variant: "signin" | "signup";
};

export type SignupCopy = {
  accountType: SignupAccountType;
  /** The other sign-up page, prefetched alongside the OTP page. */
  prefetchPath: string;
  creating: { title: string; description: string };
  codeSentDescription: string;
  /** Marks a Google sign-in as an organization sign-up (read on the callback). */
  markOrganizationIntent?: boolean;
};

export type SignupVariant = SignupCopy & {
  brand: AuthBrandPanelProps;
  title: string;
  switchPrompt: { text: string; linkLabel: string; href: string };
  divider: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitAriaLabel: string;
  trustNote: string;
};

export type SignupTracking = {
  referralCode: string | null;
  redirect: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

export type VerifyOtpOptions = {
  email: string;
  redirect: string | null;
};

export type BeatOtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  showHelper?: boolean;
  onPasteSuccess?: () => void;
};
