/** The most digits accepted: up to hundreds of billions, far beyond any real giving budget. */
const MAX_DIGITS = 12;

/**
 * Keeps digits only and groups them in thousands as someone types:
 * "5000000" becomes "5,000,000". Works on the text, not a number, so long
 * values are never rounded.
 */
export function formatThousands(raw: string): string {
  const digits = raw
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, MAX_DIGITS);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
