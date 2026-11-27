import { campaignCategoryStyles } from "@/lib/causes/campaign-categories";
import type { InterestOption } from "@/types/interest-types";

/**
 * Interests saved before this list followed the campaign categories used these
 * ids for three of them. Keeping the ids means those saved choices, and the
 * mobile app's, keep matching.
 */
const LEGACY_INTEREST_IDS: Record<string, string> = {
  disaster: "disaster-relief",
  business: "small-business",
  environment: "climate",
};

/**
 * What people can say they want to fund: exactly the campaign categories, so
 * every choice can match real campaigns. Add a category to
 * `campaign-categories.ts` and it appears here.
 */
export const interestOptions: InterestOption[] = campaignCategoryStyles.map(
  (category) => ({
    id: LEGACY_INTEREST_IDS[category.id] ?? category.id,
    label: category.name,
    icon: category.icon,
    campaignCategoryId: category.id,
  }),
);

export const MIN_INTERESTS_REQUIRED = 3;

/** The name people see for a saved interest id; an id that is no longer offered shows as itself. */
export function interestLabel(id: string) {
  return interestOptions.find((option) => option.id === id)?.label ?? id;
}
