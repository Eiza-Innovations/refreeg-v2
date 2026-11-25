/**
 * tests/lib/wishlist-slug-season.test.ts
 *
 * Unit tests for wishlist slug allocation and the season window: slugs stay
 * unique under collisions, and the festive layer follows the Dec 1 - Jan 6
 * window with the WISHLIST_SEASON override.
 */

import {
  allocateUniqueWishlistSlug,
  slugifyWishlistTitle,
} from "@/lib/wishlist/slug";
import { isWishlistSeasonActive } from "@/lib/wishlist/season";

describe("wishlist slug", () => {
  it("slugifies titles and falls back to 'wishlist' on symbols", () => {
    expect(slugifyWishlistTitle("Nomso's Christmas Wishlist")).toBe(
      "nomso-s-christmas-wishlist",
    );
    expect(slugifyWishlistTitle("   ")).toBe("wishlist");
  });

  it("appends numeric suffixes while the base is taken", async () => {
    const taken = new Set(["christmas"]);
    const slug = await allocateUniqueWishlistSlug("Christmas", {
      isTaken: (s) => Promise.resolve(taken.has(s)),
    });
    expect(slug).toBe("christmas-2");
  });

  it("falls back to a random id suffix after 50 collisions", async () => {
    const slug = await allocateUniqueWishlistSlug("Christmas", {
      isTaken: () => Promise.resolve(true),
      shortId: "abcd1234-5678",
    });
    expect(slug).toMatch(/^christmas-abcd1234$|^wishlist-abcd1234$/);
  });
});

describe("wishlist season window", () => {
  const withEnv = (value: string | undefined, run: () => void) => {
    const original = process.env.WISHLIST_SEASON;
    if (value === undefined) delete process.env.WISHLIST_SEASON;
    else process.env.WISHLIST_SEASON = value;
    try {
      run();
    } finally {
      if (original === undefined) delete process.env.WISHLIST_SEASON;
      else process.env.WISHLIST_SEASON = original;
    }
  };

  it("is active across Christmas and the first days of January", () => {
    withEnv(undefined, () => {
      expect(isWishlistSeasonActive(new Date("2026-12-25T12:00:00Z"))).toBe(
        true,
      );
      expect(isWishlistSeasonActive(new Date("2027-01-06T23:00:00Z"))).toBe(
        true,
      );
    });
  });

  it("is plain before December and after January 6", () => {
    withEnv(undefined, () => {
      expect(isWishlistSeasonActive(new Date("2026-11-25T12:00:00Z"))).toBe(
        false,
      );
      expect(isWishlistSeasonActive(new Date("2027-01-07T00:00:00Z"))).toBe(
        false,
      );
      expect(isWishlistSeasonActive(new Date("2027-07-04T12:00:00Z"))).toBe(
        false,
      );
    });
  });

  it("honours the WISHLIST_SEASON override in both directions", () => {
    withEnv("off", () => {
      expect(isWishlistSeasonActive(new Date("2026-12-25T12:00:00Z"))).toBe(
        false,
      );
    });
    withEnv("on", () => {
      expect(isWishlistSeasonActive(new Date("2027-07-04T12:00:00Z"))).toBe(
        true,
      );
    });
  });
});
