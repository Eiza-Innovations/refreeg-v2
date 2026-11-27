// Christmas is presentation state only: nothing seasonal is stored on
// wishlist rows, so when this window closes every list renders as the plain
// registry — no migration, no per-row theme to clean up.
const SEASON_START_MONTH = 11; // December
const SEASON_END_MONTH = 0; // January
const SEASON_END_DAY = 6; // window closes after Jan 6

/**
 * Whether the festive layer should render. WISHLIST_SEASON=on|off overrides
 * the window so the theme can be demoed or held back without a deploy.
 */
export function isWishlistSeasonActive(now: Date = new Date()): boolean {
  const forced = process.env.WISHLIST_SEASON?.trim().toLowerCase();
  if (forced === "on") return true;
  if (forced === "off") return false;

  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  return (
    (month === SEASON_START_MONTH && day >= 1) ||
    (month === SEASON_END_MONTH && day <= SEASON_END_DAY)
  );
}
