import { z } from "zod";

// A wishlist holds at most 8 items; the action enforces the cap on insert so
// a stale client cannot sneak item 9 in.
export const WISHLIST_ITEM_CAP = 8;

export const WISHLIST_ITEM_PRICE_MIN = 100;
export const WISHLIST_ITEM_PRICE_MAX = 10_000_000;

export const WISHLIST_CONTRIBUTION_MIN = 100;

// Publishing a wishlist needs only a verified bank account. Once an owner's
// wishlist total crosses this ceiling, contributions pause until full KYC
// clears — a fraud cap on anonymous share-link money, not a feature gate.
export const WISHLIST_KYC_THRESHOLD_NAIRA = 500_000;

export const wishlistCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Give the wishlist a name.")
    .max(120, "Keep the name under 120 characters."),
  message: z
    .string()
    .trim()
    .max(500, "Notes stay under 500 characters.")
    .optional()
    .or(z.literal("")),
});

export const wishlistUpdateSchema = wishlistCreateSchema.partial();

export const wishlistItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the item a name.")
    .max(140, "Keep the name under 140 characters."),
  price: z
    .number({ invalid_type_error: "Set a price in naira." })
    .min(
      WISHLIST_ITEM_PRICE_MIN,
      `The smallest item price is ₦${WISHLIST_ITEM_PRICE_MIN}.`,
    )
    .max(
      WISHLIST_ITEM_PRICE_MAX,
      `Keep the price under ₦${WISHLIST_ITEM_PRICE_MAX.toLocaleString()}.`,
    ),
  note: z
    .string()
    .trim()
    .max(280, "Notes stay under 280 characters.")
    .optional()
    .or(z.literal("")),
  sort_order: z
    .number()
    .int()
    .min(0)
    .max(WISHLIST_ITEM_CAP - 1)
    .optional(),
});

export const wishlistItemsSchema = z
  .array(wishlistItemSchema)
  .min(1, "Add at least one item.")
  .max(WISHLIST_ITEM_CAP, `A wishlist holds up to ${WISHLIST_ITEM_CAP} items.`);

/** The giver's dialog payload. The remaining-balance cap is server-owned. */
export const wishlistContributionSchema = z
  .object({
    amount: z
      .number({ invalid_type_error: "Enter an amount in naira." })
      .min(
        WISHLIST_CONTRIBUTION_MIN,
        `The smallest gift is ₦${WISHLIST_CONTRIBUTION_MIN}.`,
      ),
    name: z.string().trim(),
    email: z
      .string()
      .trim()
      .min(1, "Add your email so we can send your receipt.")
      .email("Enter a valid email."),
    message: z
      .string()
      .trim()
      .max(280, "Messages stay under 280 characters.")
      .optional()
      .or(z.literal("")),
    isAnonymous: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.isAnonymous && !value.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "Name is required.",
      });
    }
  });
