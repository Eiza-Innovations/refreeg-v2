/**
 * Turns "korahq.com" or "https://korahq.com" into a full URL, or null when the
 * value is blank. Throws "Enter a valid <label> URL." when it cannot be one.
 */
const DOMAIN_HOSTNAME =
  /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]{2,}$/i;

export function normalizeOptionalUrl(value: string | undefined, label: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    // Browsers percent-encode spaces in a host instead of rejecting it, so
    // check the shape of the hostname ourselves to behave the same everywhere.
    if (!DOMAIN_HOSTNAME.test(url.hostname)) throw new Error();
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new Error(`Enter a valid ${label} URL.`);
  }
}
