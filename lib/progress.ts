/** Share of a goal reached, as a whole percent capped at 100 (0 without a goal). */
export function goalPercent(raised: number, goal: number) {
  if (!goal || goal <= 0) return 0;
  return Math.min(Math.round((raised / goal) * 100), 100);
}
