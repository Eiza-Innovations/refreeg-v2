import {
  DEFAULT_STORE_REVIEW_DEMO_EMAIL,
  STORE_REVIEW_DEMO_REFERENCE_PREFIX,
  STORE_REVIEW_DEMO_REFERENCE_TTL_MS,
  decodeStoreReviewDemoReference,
  encodeStoreReviewDemoReference,
  getStoreReviewDemoEmail,
  isStoreReviewDemoAccount,
  isStoreReviewDemoEnabled,
} from "@/lib/auth/store-review-demo";

describe("store-review-demo", () => {
  const originalEnv = { ...process.env };
  const writableEnv = process.env as Record<string, string | undefined>;

  beforeEach(() => {
    writableEnv.STORE_REVIEW_DEMO_ENABLED = "true";
    writableEnv.STORE_REVIEW_DEMO_EMAIL = DEFAULT_STORE_REVIEW_DEMO_EMAIL;
    writableEnv.AUTH_SECRET = "test-store-review-secret-key-32-chars";
    delete writableEnv.NEXTAUTH_SECRET;
    writableEnv.NODE_ENV = "test";
  });

  afterEach(() => {
    for (const key of [
      "STORE_REVIEW_DEMO_ENABLED",
      "STORE_REVIEW_DEMO_EMAIL",
      "AUTH_SECRET",
      "NEXTAUTH_SECRET",
      "NODE_ENV",
    ]) {
      if (originalEnv[key] === undefined) {
        delete writableEnv[key];
      } else {
        writableEnv[key] = originalEnv[key];
      }
    }
  });

  it("enables demo mode only when STORE_REVIEW_DEMO_ENABLED is 'true'", () => {
    expect(isStoreReviewDemoEnabled()).toBe(true);

    writableEnv.STORE_REVIEW_DEMO_ENABLED = "false";
    expect(isStoreReviewDemoEnabled()).toBe(false);

    delete writableEnv.STORE_REVIEW_DEMO_ENABLED;
    expect(isStoreReviewDemoEnabled()).toBe(false);
  });

  it("normalizes and falls back for demo reviewer email", () => {
    delete writableEnv.STORE_REVIEW_DEMO_EMAIL;
    expect(getStoreReviewDemoEmail()).toBe(DEFAULT_STORE_REVIEW_DEMO_EMAIL);

    writableEnv.STORE_REVIEW_DEMO_EMAIL = "  Reviewer@Example.COM  ";
    expect(getStoreReviewDemoEmail()).toBe("reviewer@example.com");
  });

  it("matches only the single configured reviewer account when enabled", () => {
    expect(isStoreReviewDemoAccount("  PLAYREVIEW@refreeg.com ")).toBe(true);
    expect(isStoreReviewDemoAccount("donor@refreeg.com")).toBe(false);
    expect(isStoreReviewDemoAccount(null)).toBe(false);
    expect(isStoreReviewDemoAccount(undefined)).toBe(false);

    writableEnv.STORE_REVIEW_DEMO_ENABLED = "false";
    expect(isStoreReviewDemoAccount("playreview@refreeg.com")).toBe(false);
  });

  it("encodes and verifies an HMAC-SHA256 signed demo reference", () => {
    const createdAt = new Date().toISOString();
    const reference = encodeStoreReviewDemoReference({
      causeId: "cause-123",
      amount: 5000,
      tipAmount: 250,
      donorName: "Play Reviewer",
      message: "Great cause!",
      isAnonymous: false,
      createdAt,
    });

    expect(reference.startsWith(STORE_REVIEW_DEMO_REFERENCE_PREFIX)).toBe(true);

    const decoded = decodeStoreReviewDemoReference(reference);
    expect(decoded).toEqual({
      causeId: "cause-123",
      amount: 5000,
      tipAmount: 250,
      donorName: "Play Reviewer",
      message: "Great cause!",
      isAnonymous: false,
      createdAt,
    });
  });

  it("rejects validly signed tokens when expired beyond the 24h TTL", () => {
    const expiredAt = new Date(
      Date.now() - STORE_REVIEW_DEMO_REFERENCE_TTL_MS - 60_000,
    ).toISOString();
    const expiredRef = encodeStoreReviewDemoReference({
      causeId: "cause-123",
      amount: 5000,
      tipAmount: 0,
      donorName: "Play Reviewer",
      message: "",
      isAnonymous: false,
      createdAt: expiredAt,
    });

    expect(decodeStoreReviewDemoReference(expiredRef)).toBeNull();
  });

  it("rejects validly signed tokens when STORE_REVIEW_DEMO_ENABLED is not 'true'", () => {
    const reference = encodeStoreReviewDemoReference({
      causeId: "cause-123",
      amount: 5000,
      tipAmount: 0,
      donorName: "Play Reviewer",
      message: "",
      isAnonymous: false,
    });

    writableEnv.STORE_REVIEW_DEMO_ENABLED = "false";
    expect(decodeStoreReviewDemoReference(reference)).toBeNull();
  });

  it("rejects tampered signatures, tampered payloads, and malformed references", () => {
    const reference = encodeStoreReviewDemoReference({
      causeId: "cause-123",
      amount: 5000,
      tipAmount: 100,
      donorName: "Play Reviewer",
      message: "hello",
      isAnonymous: false,
    });

    const [prefixAndPayload, sigHex] = reference.split(".");
    const flippedLastChar = sigHex.endsWith("0") ? "1" : "0";
    const tamperedSigRef = `${prefixAndPayload}.${sigHex.slice(0, -1)}${flippedLastChar}`;
    expect(decodeStoreReviewDemoReference(tamperedSigRef)).toBeNull();

    const forgedPayload = Buffer.from(
      JSON.stringify({
        causeId: "cause-123",
        amount: 999999,
        tipAmount: 0,
        donorName: "Attacker",
        message: "",
        isAnonymous: false,
        createdAt: new Date().toISOString(),
      }),
      "utf8",
    ).toString("base64url");
    expect(
      decodeStoreReviewDemoReference(
        `${STORE_REVIEW_DEMO_REFERENCE_PREFIX}${forgedPayload}.${sigHex}`,
      ),
    ).toBeNull();

    expect(decodeStoreReviewDemoReference(null)).toBeNull();
    expect(decodeStoreReviewDemoReference("paystack_ref_123")).toBeNull();
    expect(
      decodeStoreReviewDemoReference(
        `${STORE_REVIEW_DEMO_REFERENCE_PREFIX}nodot`,
      ),
    ).toBeNull();
    expect(
      decodeStoreReviewDemoReference(
        `${STORE_REVIEW_DEMO_REFERENCE_PREFIX}a.b.c`,
      ),
    ).toBeNull();
    expect(
      decodeStoreReviewDemoReference(
        `${STORE_REVIEW_DEMO_REFERENCE_PREFIX}abc.not-hex`,
      ),
    ).toBeNull();
  });

  it("rejects payloads with invalid causeId or non-positive amounts", () => {
    const badAmountRef = encodeStoreReviewDemoReference({
      causeId: "cause-123",
      amount: 0,
      tipAmount: 0,
      donorName: "Play Reviewer",
      message: "",
      isAnonymous: false,
    });
    const badCauseRef = encodeStoreReviewDemoReference({
      causeId: "   ",
      amount: 1000,
      tipAmount: 0,
      donorName: "Play Reviewer",
      message: "",
      isAnonymous: false,
    });

    expect(decodeStoreReviewDemoReference(badAmountRef)).toBeNull();
    expect(decodeStoreReviewDemoReference(badCauseRef)).toBeNull();
  });

  it("requires AUTH_SECRET or NEXTAUTH_SECRET in production", () => {
    writableEnv.NODE_ENV = "production";
    delete writableEnv.AUTH_SECRET;
    delete writableEnv.NEXTAUTH_SECRET;

    expect(() =>
      encodeStoreReviewDemoReference({
        causeId: "cause-123",
        amount: 1000,
        tipAmount: 0,
        donorName: "Play Reviewer",
        message: "",
        isAnonymous: false,
      }),
    ).toThrow("AUTH_SECRET must be configured in production");
  });
});
