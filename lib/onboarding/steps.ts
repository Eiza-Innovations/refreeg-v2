import type { ResumeStepInput, StepId } from "@/types/onboarding-types";

export const individualSteps: StepId[] = [
  "account-type",
  "gender",
  "profile",
  "kyc",
  "interests",
  "complete",
];

/** CSR setup only applies when the organisation gives as a company. */
export function organizationSteps(purpose: string): StepId[] {
  return purpose === "fundraising"
    ? ["account-type", "org-details", "checklist"]
    : ["account-type", "org-details", "csr-setup", "checklist"];
}

/**
 * Where the wizard opens. Sign-up already stores the account type, so the saved
 * step skips straight past "How will you use RefreeG?". Everyone still sees
 * that step once, with their sign-up choice preselected: individuals until they
 * confirm it (remembered in this browser), organisations until they have
 * picked a purpose, which only that step asks.
 */
export function resumeStepId(input: ResumeStepInput): StepId {
  const { dbStep, accountType, organizationPurpose, step1Confirmed } = input;
  if (accountType === "organization") {
    if (!organizationPurpose && dbStep < 3.6) return "account-type";
  } else if (!step1Confirmed && dbStep === 2) {
    return "account-type";
  }
  return dbStepToStepId(dbStep, accountType);
}

/** Maps the step number stored in the database to the step to resume on. */
export function dbStepToStepId(dbStep: number, accountType: string): StepId {
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
