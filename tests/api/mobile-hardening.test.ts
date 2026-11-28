import { parsePagination } from "@/lib/api/pagination";
import { prisma } from "@/lib/prisma";
import { GET as getKycSession } from "@/app/api/mobile/kyc/session/[sessionId]/route";
import { POST as createKycSession } from "@/app/api/mobile/kyc/route";
import { GET as getBreetStatus } from "@/app/api/webhooks/breet/route";
import { GET as getUserDonations } from "@/app/api/mobile/donations/user/route";
import { GET as getBanks } from "@/app/api/mobile/geo/banks/route";
import { getDashboardStats } from "@/actions/users/dashboard-actions";
import Paystack from "@/services/paystack";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      body,
      status: init?.status || 200,
      headers: init?.headers || {},
      json: async () => body,
    })),
  },
  NextRequest: class {},
}));

jest.mock("@/lib/auth/mobile-auth", () => ({
  authenticateMobileRequest: jest.fn().mockResolvedValue({
    user: { id: "user-1", email: "user@example.com", fullName: "Test User" },
    errorResponse: null,
  }),
}));

jest.mock("@/lib/api/rate-limit", () => ({
  enforceRateLimit: jest.fn().mockReturnValue(null),
}));

jest.mock("@/actions/users/kyc-actions", () => ({
  getVerificationStatus: jest.fn(),
}));

jest.mock("@/actions/donations/crypto-actions", () => ({
  createCryptoDonation: jest.fn(),
}));

jest.mock("@/lib/causes/proof-milestones", () => ({
  syncMilestoneRequirements: jest.fn(),
}));

jest.mock("@/lib/payments/breet", () => ({
  breetAssetNetwork: jest.fn(),
  fetchBreetTransaction: jest.fn(),
  parseBreetLabel: jest.fn(),
}));

jest.mock("@/services/paystack", () => ({
  __esModule: true,
  default: {
    listBanks: jest.fn(),
  },
}));

jest.mock("react", () => {
  const actual = jest.requireActual("react");
  return {
    ...actual,
    cache: (fn: unknown) => fn,
  };
});

jest.mock("@/lib/prisma", () => ({
  prisma: {
    kyc_verifications: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    crypto_donations: {
      findFirst: jest.fn(),
    },
    donation: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    cause: {
      findMany: jest.fn(),
    },
  },
}));

describe("QA Security & Performance Hardening", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, DIDIT_API_KEY: "test-didit-key" };
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  describe("parsePagination", () => {
    it("clamps oversized, negative, and NaN parameters", () => {
      expect(
        parsePagination(new URLSearchParams("limit=9999&offset=-5")),
      ).toEqual({ limit: 50, offset: 0 });
      expect(parsePagination(new URLSearchParams("limit=0"))).toEqual({
        limit: 1,
        offset: 0,
      });
      expect(
        parsePagination(new URLSearchParams("limit=abc&offset=xyz")),
      ).toEqual({ limit: 10, offset: 0 });
      expect(
        parsePagination(new URLSearchParams("limit=25&offset=40")),
      ).toEqual({ limit: 25, offset: 40 });
    });
  });

  describe("GET /api/mobile/kyc/session/[sessionId]", () => {
    it("rejects path traversal sessionId with 400", async () => {
      const res = await getKycSession({} as any, {
        params: Promise.resolve({ sessionId: "../other-endpoint" }),
      });
      expect(res.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects session not owned in kyc_verifications with 403", async () => {
      (prisma.kyc_verifications.findFirst as jest.Mock).mockResolvedValueOnce(
        null,
      );
      const res = await getKycSession({} as any, {
        params: Promise.resolve({ sessionId: "sess_123" }),
      });
      expect(res.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("fails closed with 403 if Didit omits vendor_data", async () => {
      (prisma.kyc_verifications.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "k1",
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "Approved" }),
      });

      const res = await getKycSession({} as any, {
        params: Promise.resolve({ sessionId: "sess_123" }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/mobile/kyc", () => {
    it("rejects untrusted callback_url with 400", async () => {
      (prisma.kyc_verifications.findFirst as jest.Mock).mockResolvedValueOnce(
        null,
      );
      (prisma.kyc_verifications.updateMany as jest.Mock).mockResolvedValueOnce({
        count: 0,
      });

      const res = await createKycSession({
        json: async () => ({ callback_url: "https://evil.example/phish" }),
      } as any);

      expect(res.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/webhooks/breet", () => {
    it("rejects invalid non-UUID causeId with 400", async () => {
      const res = await getBreetStatus({
        url: "https://www.refreeg.com/api/webhooks/breet?checkStatus=true&causeId=not-a-uuid",
      } as any);
      expect(res.status).toBe(400);
      expect(prisma.crypto_donations.findFirst).not.toHaveBeenCalled();
    });

    it("does not leak raw error messages on internal failure", async () => {
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (prisma.crypto_donations.findFirst as jest.Mock).mockRejectedValueOnce(
        new Error("SELECT * FROM sensitive_table failed"),
      );

      const res = await getBreetStatus({
        url: "https://www.refreeg.com/api/webhooks/breet?checkStatus=true&causeId=11111111-1111-4111-8111-111111111111",
      } as any);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Internal server error");
      errorSpy.mockRestore();
    });
  });

  describe("GET /api/mobile/donations/user", () => {
    it("clamps excessive limit to 50 and runs paginated query", async () => {
      (prisma.donation.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.donation.count as jest.Mock).mockResolvedValueOnce(0);

      const res = await getUserDonations({
        url: "https://www.refreeg.com/api/mobile/donations/user?limit=9999&offset=-3",
      } as any);

      expect(res.status).toBe(200);
      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 }),
      );
      const data = await res.json();
      expect(data.meta).toEqual({ total: 0, limit: 50, offset: 0 });
    });
  });

  describe("GET /api/mobile/geo/banks", () => {
    it("does not cache empty bank lists after transient failures", async () => {
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (Paystack.listBanks as jest.Mock).mockResolvedValueOnce([]);
      const first = await getBanks();
      expect(first.status).toBe(500);

      (Paystack.listBanks as jest.Mock).mockResolvedValueOnce([
        { name: "Access Bank", code: "044" },
      ]);
      const second = await getBanks();
      expect(second.status).toBe(200);
      errorSpy.mockRestore();
    });
  });

  describe("getDashboardStats", () => {
    it("only aggregates completed donations", async () => {
      (prisma.cause.findMany as jest.Mock).mockResolvedValueOnce([
        { id: "c1", status: "approved" },
      ]);
      (prisma.donation.groupBy as jest.Mock)
        .mockResolvedValueOnce([{ causeId: "c1", _sum: { amount: 5000 } }])
        .mockResolvedValueOnce([{ userId: "u1" }]);

      const stats = await getDashboardStats("owner-1");
      expect(stats).toEqual({
        totalRaised: 5000,
        totalDonors: 1,
        activeCauses: 1,
      });
      expect(prisma.donation.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "completed" }),
        }),
      );
    });
  });
});
