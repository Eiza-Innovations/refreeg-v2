import type { Wishlist, WishlistContribution, WishlistItem } from "@/types";

export const toIso = (value: Date | string | null | undefined) =>
  value instanceof Date ? value.toISOString() : (value ?? null);

export const mapPrismaToWishlist = (w: any): Wishlist => ({
  ...w,
  created_at: toIso(w.created_at),
  updated_at: toIso(w.updated_at),
});

export const mapPrismaToWishlistItem = (i: any): WishlistItem => ({
  ...i,
  price: Number(i.price),
  contributed: Number(i.contributed),
  funded_at: toIso(i.funded_at),
  created_at: toIso(i.created_at),
  updated_at: toIso(i.updated_at),
});

export const mapPrismaToWishlistContribution = (
  c: any,
): WishlistContribution => ({
  ...c,
  amount: Number(c.amount),
  created_at: toIso(c.created_at),
});

/** Cover-first previews: first images in item display order, imageless items skipped. */
export const pickPreviewImages = (
  items: { image_url: string | null | undefined }[],
  limit = 3,
): string[] =>
  items
    .map((item) => item.image_url)
    .filter((url): url is string => Boolean(url))
    .slice(0, limit);
