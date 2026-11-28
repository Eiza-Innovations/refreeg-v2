const MAX_SLUG_LENGTH = 60;

export function slugifyWishlistTitle(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0027\u2018\u2019\u02BC\u201A\u2032]+/g, "")
    .replace(/[\u0022\u201C\u201D\u201E\u2033]+/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);

  return base || "wishlist";
}

export function wishlistPublicPath(w: { ownerUsername: string; slug: string }) {
  return `/${w.ownerUsername}/w/${w.slug}`;
}
