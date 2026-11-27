/**
 * Prisma's default 5s interactive-transaction timeout expired on a slow
 * database round trip (P2028) and failed a correct code with a 500. The
 * account-creation transaction must carry an explicit, longer timeout.
 */
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      json: () => Promise.resolve(body),
    }),
  },
}));

const mockTransaction = jest.fn();
const mockFindPending = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pendingRegistration: {
      findUnique: (...args: unknown[]) => mockFindPending(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));
jest.mock("@/lib/referrals/referral-utils", () => ({
  createReferralRecord: jest.fn(),
}));
jest.mock("@/lib/auth/welcome", () => ({
  runPostSignupActions: jest.fn().mockResolvedValue(undefined),
}));

process.env.AUTH_SECRET = "test-secret";

import { POST } from "@/app/api/auth/verify-otp/route";
import { hashOtpCode } from "@/lib/auth/otp";

describe("verify-otp account creation", () => {
  it("runs the create-user transaction with a timeout above Prisma's 5s default", async () => {
    mockFindPending.mockResolvedValue({
      email: "new@example.com",
      otpCode: hashOtpCode("123456"),
      failedAttempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
      accountType: "individual",
    });
    mockTransaction.mockResolvedValue({
      id: "user-1",
      email: "new@example.com",
      fullName: "New User",
      accountType: "individual",
    });

    await POST({
      json: async () => ({ email: "new@example.com", otpCode: "123456" }),
    } as unknown as Request);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    const options = mockTransaction.mock.calls[0][1];
    expect(options.timeout).toBeGreaterThan(5_000);
    expect(options.maxWait).toBeGreaterThan(2_000);
  });
});
