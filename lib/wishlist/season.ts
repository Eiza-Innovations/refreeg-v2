const SEASON_START_MONTH = 11;
const SEASON_END_MONTH = 0;
const SEASON_END_DAY = 6;

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
