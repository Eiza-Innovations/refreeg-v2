/**
 * The web sign-up routes must store the verification code as HMAC(code, AUTH_SECRET),
 * because /api/auth/verify-otp compares a hash. Storing the plain code made every
 * correct code fail.
 */
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      json: () => Promise.resolve(body),
    }),
  },
  NextRequest: class {},
  after: (fn: () => unknown) => fn(),
}));

const mockUpsert = jest.fn().mockResolvedValue({ id: "pending-id" });
const mockUpdate = jest.fn().mockResolvedValue({});
const mockFindPending = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    pendingRegistration: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      findUnique: (...args: unknown[]) => mockFindPending(...args),
    },
  },
}));

const mockSendOtpEmail = jest.fn().mockResolvedValue({ success: true });
jest.mock("@/services/mail", () => ({
  sendOtpEmail: (...args: unknown[]) => mockSendOtpEmail(...args),
}));
jest.mock("bcryptjs", () => ({ hash: jest.fn().mockResolvedValue("hashed") }));

process.env.AUTH_SECRET = "test-secret";

import { POST as register } from "@/app/api/auth/register-pending/route";
import { POST as resend } from "@/app/api/auth/resend-otp/route";
import { hashOtpCode, otpMatches } from "@/lib/auth/otp";

const request = (body: Record<string, unknown>) =>
  ({
    json: jest.fn().mockResolvedValue(body),
    headers: { get: () => null },
  }) as unknown as Request;

describe("OTP storage in the web auth routes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("register-pending stores a hash of the code it emails", async () => {
    await register(
      request({
        accountType: "individual",
        email: "new@example.com",
        password: "Password1!",
      }),
    );

    const emailed = mockSendOtpEmail.mock.calls[0][0].otpCode as string;
    const stored = mockUpsert.mock.calls[0][0].create.otpCode as string;
    expect(emailed).toMatch(/^\d{6}$/);
    expect(stored).not.toBe(emailed);
    expect(stored).toBe(hashOtpCode(emailed));
    expect(otpMatches(emailed, stored)).toBe(true);
    expect(mockUpsert.mock.calls[0][0].update.otpCode).toBe(stored);
  });

  it("resend-otp stores a hash of the new code it emails", async () => {
    mockFindPending.mockResolvedValue({
      email: "new@example.com",
      fullName: "New User",
      lastOtpSentAt: new Date(Date.now() - 120_000),
    });

    await resend(request({ email: "new@example.com" }));

    const emailed = mockSendOtpEmail.mock.calls[0][0].otpCode as string;
    const stored = mockUpdate.mock.calls[0][0].data.otpCode as string;
    expect(stored).not.toBe(emailed);
    expect(otpMatches(emailed, stored)).toBe(true);
  });
});
