const MAX_SLUG_LENGTH = 60;

export function slugifyWishlistTitle(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);

  return base || "wishlist";
}

export async function allocateUniqueWishlistSlug(
  title: string,
  options: {
    isTaken: (slug: string) => Promise<boolean>;
    shortId?: string;
  },
): Promise<string> {
  const base = slugifyWishlistTitle(title);
  let candidate = base;
  let suffix = 2;

  while (await options.isTaken(candidate)) {
    if (suffix > 50) {
      const idPart = (options.shortId || crypto.randomUUID())
        .replace(/-/g, "")
        .slice(0, 8);
      candidate = `${base.slice(0, Math.max(1, MAX_SLUG_LENGTH - 9))}-${idPart}`;
      if (!(await options.isTaken(candidate))) {
        return candidate;
      }
      candidate = `wishlist-${idPart}`;
      return candidate;
    }

    const suffixText = `-${suffix}`;
    candidate = `${base.slice(0, Math.max(1, MAX_SLUG_LENGTH - suffixText.length))}${suffixText}`;
    suffix += 1;
  }

  return candidate;
}
