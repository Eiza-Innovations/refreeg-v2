import crypto from "crypto";

export const STORE_REVIEW_DEMO_REFERENCE_PREFIX = "ref_store_review_";
export const DEFAULT_STORE_REVIEW_DEMO_EMAIL = "playreview@refreeg.com";
export const STORE_REVIEW_DEMO_REFERENCE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

export interface StoreReviewDemoPayload {
  causeId: string;
  amount: number;
  tipAmount: number;
  donorName: string;
  message: string;
  isAnonymous: boolean;
  createdAt: string;
}

export const STORE_REVIEW_DEMO_SAVED_CARD = {
  id: "store_review_demo_card",
  card_type: "visa",
  last4: "4081",
  exp_month: "12",
  exp_year: "2030",
  bank: "Store Review Demo Bank",
  brand: "Visa",
  is_default: true,
  created_at: "2026-01-01T00:00:00.000Z",
};

function getStoreReviewSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be configured in production");
    }
    return "development-secret-key-123456789";
  }
  return secret;
}

/**
 * Returns true only when STORE_REVIEW_DEMO_ENABLED is explicitly set to "true".
 * Turn this off in production environment variables immediately after store review passes.
 */
export function isStoreReviewDemoEnabled(): boolean {
  return process.env.STORE_REVIEW_DEMO_ENABLED === "true";
}

/**
 * Returns the single email address permitted to use Store Review Demo Mode.
 */
export function getStoreReviewDemoEmail(): string {
  return (
    process.env.STORE_REVIEW_DEMO_EMAIL || DEFAULT_STORE_REVIEW_DEMO_EMAIL
  )
    .trim()
    .toLowerCase();
}

/**
 * Strictly checks both that Store Review Demo Mode is enabled on the server AND
 * that the authenticated user's email matches the single configured reviewer account.
 */
export function isStoreReviewDemoAccount(email?: string | null): boolean {
  if (!isStoreReviewDemoEnabled() || !email) {
    return false;
  }
  return email.trim().toLowerCase() === getStoreReviewDemoEmail();
}

/**
 * Encodes an HMAC-SHA256 signed demo transaction reference so verification can
 * return a realistic receipt to the store reviewer without polluting production
 * financial tables or allowing forged demo references.
 */
export function encodeStoreReviewDemoReference(
  payload: Omit<StoreReviewDemoPayload, "createdAt"> & { createdAt?: string },
): string {
  const fullPayload: StoreReviewDemoPayload = {
    causeId: payload.causeId,
    amount: payload.amount,
    tipAmount: payload.tipAmount,
    donorName: payload.donorName,
    message: payload.message,
    isAnonymous: payload.isAnonymous,
    createdAt: payload.createdAt || new Date().toISOString(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload), "utf8").toString(
    "base64url",
  );
  const sigHex = crypto
    .createHmac("sha256", getStoreReviewSecret())
    .update(payloadB64)
    .digest("hex");
  return `${STORE_REVIEW_DEMO_REFERENCE_PREFIX}${payloadB64}.${sigHex}`;
}

/**
 * Decodes and verifies an HMAC-signed Store Review Demo reference if and only if
 * Store Review Demo Mode is enabled and the token is within its 24h TTL.
 */
export function decodeStoreReviewDemoReference(
  reference?: string | null,
): StoreReviewDemoPayload | null {
  if (
    !isStoreReviewDemoEnabled() ||
    !reference ||
    !reference.startsWith(STORE_REVIEW_DEMO_REFERENCE_PREFIX)
  ) {
    return null;
  }

  const remainder = reference.slice(STORE_REVIEW_DEMO_REFERENCE_PREFIX.length);
  const dotIndex = remainder.indexOf(".");
  if (dotIndex <= 0 || dotIndex !== remainder.lastIndexOf(".")) {
    return null;
  }

  const payloadB64 = remainder.slice(0, dotIndex);
  const sigHex = remainder.slice(dotIndex + 1);
  if (!payloadB64 || !/^[0-9a-f]{64}$/i.test(sigHex)) {
    return null;
  }

  try {
    const expectedSig = crypto
      .createHmac("sha256", getStoreReviewSecret())
      .update(payloadB64)
      .digest("hex");

    const actualBuf = Buffer.from(sigHex.toLowerCase(), "utf8");
    const expectedBuf = Buffer.from(expectedSig.toLowerCase(), "utf8");
    if (
      actualBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(actualBuf, expectedBuf)
    ) {
      return null;
    }

    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<StoreReviewDemoPayload>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.causeId !== "string" ||
      !parsed.causeId.trim() ||
      typeof parsed.amount !== "number" ||
      !Number.isFinite(parsed.amount) ||
      parsed.amount <= 0 ||
      typeof parsed.createdAt !== "string"
    ) {
      return null;
    }

    const createdAtMs = Date.parse(parsed.createdAt);
    const nowMs = Date.now();
    if (
      !Number.isFinite(createdAtMs) ||
      nowMs - createdAtMs > STORE_REVIEW_DEMO_REFERENCE_TTL_MS ||
      createdAtMs - nowMs > MAX_FUTURE_CLOCK_SKEW_MS
    ) {
      return null;
    }

    const tipAmount =
      parsed.tipAmount === undefined ? 0 : Number(parsed.tipAmount);
    if (!Number.isFinite(tipAmount) || tipAmount < 0) {
      return null;
    }

    return {
      causeId: parsed.causeId.trim(),
      amount: parsed.amount,
      tipAmount,
      donorName: String(parsed.donorName || "Store Reviewer"),
      message: String(parsed.message || ""),
      isAnonymous: Boolean(parsed.isAnonymous),
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}
