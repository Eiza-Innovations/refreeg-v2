import { z } from "zod";
import { partnerCategoryOptions } from "@/lib/options/partner-credits.options";

const MAX_CURRENCY_AMOUNT = 1_000_000_000;

const CATEGORY_VALUES = new Set<string>(
  partnerCategoryOptions.map((opt) => opt.value),
);

function isValidCurrencyString(val: string): boolean {
  const cleaned = val.replace(/,/g, "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return false;
  const num = Number(cleaned);
  return (
    Number.isFinite(num) &&
    Math.round(num * 100) >= 100 &&
    num <= MAX_CURRENCY_AMOUNT
  );
}

const positiveCurrencyString = z
  .string()
  .trim()
  .refine(
    isValidCurrencyString,
    "Enter a valid amount of at least ₦1 (max 2 decimals)",
  );

const optionalPositiveCurrencyString = z
  .string()
  .trim()
  .refine(
    (val) => !val || isValidCurrencyString(val),
    "Amount must be at least ₦1 (max 2 decimals)",
  );

const validDateString = z
  .string()
  .trim()
  .min(1, "Select an expiry date")
  .refine((val) => !Number.isNaN(Date.parse(val)), "Enter a valid expiry date");

const categoryArraySchema = z
  .array(z.string().trim())
  .refine(
    (vals) => vals.every((v) => CATEGORY_VALUES.has(v)),
    "Invalid category selection",
  );

export const onboardPartnerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Partner name must be at least 2 characters")
    .max(120, "Partner name is too long"),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid contact email"),
  creditsToIssue: positiveCurrencyString,
  expiresAt: validDateString,
  eligibleCategories: categoryArraySchema,
  rulesNote: z.string().trim().max(240, "Note is too long").default(""),
  maxPerCampaign: optionalPositiveCurrencyString.default(""),
  employeeMatchingEnabled: z.boolean().default(false),
  reconciliationRef: z
    .string()
    .trim()
    .min(2, "Enter the payment reconciliation reference")
    .max(128, "Reference is too long"),
  paymentReconciled: z
    .boolean()
    .refine(
      (val) => val === true,
      "Confirm payment was received and reconciled before submitting",
    ),
});

export const managePartnerSchema = z
  .object({
    expiresAt: validDateString,
    eligibleCategories: categoryArraySchema,
    rulesNote: z.string().trim().max(240, "Note is too long").default(""),
    maxPerCampaign: optionalPositiveCurrencyString.default(""),
    employeeMatchingEnabled: z.boolean().default(false),
    status: z.enum(["active", "suspended"]),
    topUpAmount: optionalPositiveCurrencyString.default(""),
    topUpRef: z.string().trim().max(128).default(""),
  })
  .refine(
    (data) => {
      if (!data.topUpAmount) return true;
      return data.topUpRef.trim().length >= 2;
    },
    {
      message: "Enter a reconciliation reference for this top up",
      path: ["topUpRef"],
    },
  );

export const rejectPartnerRequestSchema = z.object({
  reason: z.string().trim().max(240, "Reason is too long").default(""),
});

export const allocateCreditsSchema = z.object({
  causeId: z.string().trim().uuid("Select a valid campaign"),
  amount: positiveCurrencyString,
  showAsSupporter: z.boolean().default(true),
});

export const requestTopUpSchema = z.object({
  amount: positiveCurrencyString,
  reconciliationRef: z.string().trim().max(128).default(""),
  note: z.string().trim().max(240, "Note is too long").default(""),
});

export type OnboardPartnerFormValues = z.infer<typeof onboardPartnerSchema>;
export type ManagePartnerFormValues = z.infer<typeof managePartnerSchema>;
export type RejectPartnerRequestFormValues = z.infer<
  typeof rejectPartnerRequestSchema
>;
export type AllocateCreditsFormValues = z.infer<typeof allocateCreditsSchema>;
export type RequestTopUpFormValues = z.infer<typeof requestTopUpSchema>;
