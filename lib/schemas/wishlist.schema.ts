import { z } from "zod";

export const WISHLIST_ITEM_CAP = 8;

export const WISHLIST_ITEM_PRICE_MIN = 100;
export const WISHLIST_ITEM_PRICE_MAX = 10_000_000;

export const WISHLIST_CONTRIBUTION_MIN = 100;

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
  // Public wishlists appear on /wishlist and the owner's profile; private
  // ones stay reachable only through their link.
  isPublic: z.boolean().optional(),
});

export const wishlistUpdateSchema = wishlistCreateSchema.partial();

export const wishlistItemImageSchema = z
  .string()
  .trim()
  .max(500, "Image reference is too long.")
  .optional()
  .or(z.literal(""))
  .or(z.null());

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
  imageUrl: wishlistItemImageSchema,
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
