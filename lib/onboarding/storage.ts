/** Every answer the wizard keeps in the browser starts with this. */
const KEY_PREFIX = "onboarding_";

const STORAGE_KEYS = [
  "account_type",
  "organizationPurpose",
  "gender",
  "profile",
  "interests",
  "kyc_completed",
  "consent",
  // Set once the first step has been confirmed, so a refresh does not show it again.
  "step1_confirmed",
];

/** Keeps one onboarding answer so the wizard can pick it up again after a refresh. */
export function saveOnboardingAnswer(key: string, value: string) {
  localStorage.setItem(`${KEY_PREFIX}${key}`, value);
}

export function hasConfirmedStep1(): boolean {
  try {
    return localStorage.getItem(`${KEY_PREFIX}step1_confirmed`) === "1";
  } catch {
    return false;
  }
}

export function markStep1Confirmed() {
  try {
    saveOnboardingAnswer("step1_confirmed", "1");
  } catch {
    // Private mode: the first step may show once more after a refresh.
  }
}

/** Removes the onboarding answers the wizard keeps in localStorage. */
export function clearOnboardingStorage() {
  STORAGE_KEYS.forEach((key) => localStorage.removeItem(`${KEY_PREFIX}${key}`));
}
