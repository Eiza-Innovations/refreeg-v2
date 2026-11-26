const DAY_MS = 24 * 60 * 60 * 1000;

/** The end date of something that runs `daysActive` days from now. */
export function endDateFromDaysActive(daysActive?: number | null) {
  return daysActive != null
    ? new Date(Date.now() + daysActive * DAY_MS)
    : undefined;
}

/** Whole days remaining of a `daysActive` run that started at `createdAt`. */
export function daysLeft(createdAt: Date | string, daysActive?: number | null) {
  if (daysActive == null) return null;
  const elapsed = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / DAY_MS,
  );
  return Math.max(0, daysActive - elapsed);
}
