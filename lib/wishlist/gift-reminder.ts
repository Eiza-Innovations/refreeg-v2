"use client";

import type { WishlistGiftAttempt } from "@/types";

const STORAGE_KEY = "wishlistGiftAttempt";

const REMINDER_DELAY_MS = 60 * 60 * 1000;

let scheduled = false;

export function rememberAbandonedGift(attempt: WishlistGiftAttempt) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
  } catch {
    return;
  }
  scheduleWishlistGiftReminder();
}

export function scheduleWishlistGiftReminder() {
  if (typeof window === "undefined" || scheduled) return;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  let attempt: WishlistGiftAttempt;
  try {
    attempt = JSON.parse(raw) as WishlistGiftAttempt;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  if (!attempt?.email) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  const elapsed = Date.now() - new Date(attempt.attemptedAt).getTime();
  const wait = Math.max(REMINDER_DELAY_MS - elapsed, 0);
  scheduled = true;

  window.setTimeout(() => {
    scheduled = false;
    import("@/services/mail")
      .then(({ sendWishlistGiftReminderEmail }) =>
        sendWishlistGiftReminderEmail(attempt),
      )
      .then(() => window.localStorage.removeItem(STORAGE_KEY))
      .catch((error) =>
        console.error("Failed to send wishlist gift reminder:", error),
      );
  }, wait);
}
