jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/auth/admin-auth", () => ({
  getUserRole: jest.fn(),
}));

jest.mock("@/services/mail", () => ({
  sendPartnerCreditsIssuedEmail: jest.fn().mockResolvedValue({ success: true }),
}));

const mockTx = {
  partnerAccount: {
    create: jest.fn(),
    update: jest.fn(),
  },
  partnerCreditRequest: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  partnerCreditTransaction: {
    create: jest.fn(),
    aggregate: jest.fn(),
  },
  cause: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  donation: {
    create: jest.fn(),
  },
  logs: {
    create: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    partnerAccount: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    partnerCreditRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    partnerCreditTransaction: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    cause: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
  },
}));

import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/lib/auth/admin-auth";
import { prisma } from "@/lib/prisma";
import { sendPartnerCreditsIssuedEmail } from "@/services/mail";
import {
  allocatePartnerCreditsAction,
  approvePartnerCreditRequestAction,
  getPartnerCreditsDashboard,
  onboardPartnerAction,
  rejectPartnerCreditRequestAction,
  requestPartnerTopUpAction,
  updatePartnerAccountAction,
} from "@/actions/partners/partner-credit-actions";

const mockedAuth = auth as jest.Mock;
const mockedGetUserRole = getUserRole as jest.Mock;
const mockedSendEmail = sendPartnerCreditsIssuedEmail as jest.Mock;

const REQ_UUID = "11111111-1111-4111-8111-111111111111";
const PARTNER_UUID = "22222222-2222-4222-8222-222222222222";
const CAUSE_EDU_UUID = "33333333-3333-4333-8333-333333333333";
const CAUSE_ENV_UUID = "44444444-4444-4444-8444-444444444444";

describe("partner-credit-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue({
      user: { id: "admin-1", email: "admin1@refreeg.com" },
    });
    mockedGetUserRole.mockResolvedValue("admin");
  });

  it("onboardPartnerAction creates pending partner and initial grant request", async () => {
    (prisma.partnerAccount.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "u-partner",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
    mockTx.partnerAccount.create.mockResolvedValue({ id: PARTNER_UUID });
    mockTx.partnerCreditRequest.create.mockResolvedValue({ id: REQ_UUID });
    mockTx.logs.create.mockResolvedValue({});

    const res = await onboardPartnerAction({
      name: "Flutterwave Foundation",
      contactEmail: "impact@flutterwave.org",
      creditsToIssue: "8000000",
      expiresAt: "2027-12-31",
      eligibleCategories: ["education", "health"],
      rulesNote: "Education & Health only",
      maxPerCampaign: "1000000",
      employeeMatchingEnabled: true,
      reconciliationRef: "KOR-88213",
      paymentReconciled: true,
    });

    expect(res).toEqual({
      success: true,
      data: { partnerId: PARTNER_UUID, requestId: REQ_UUID },
    });
    expect(mockTx.partnerAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Flutterwave Foundation",
          contactEmail: "impact@flutterwave.org",
          status: "pending_approval",
          creditsIssued: 0,
        }),
      }),
    );
  });

  it("approvePartnerCreditRequestAction blocks self-approval and concurrency conflicts", async () => {
    (prisma.partnerCreditRequest.findUnique as jest.Mock).mockResolvedValue({
      id: REQ_UUID,
      partnerId: PARTNER_UUID,
      kind: "initial_grant",
      amount: 8000000,
      status: "pending_approval",
      requestedById: "admin-1",
      partner: {
        id: PARTNER_UUID,
        name: "Flutterwave Foundation",
        contactEmail: "impact@flutterwave.org",
        userId: null,
        status: "pending_approval",
        expiresAt: new Date("2027-12-31T00:00:00.000Z"),
      },
    });

    const selfRes = await approvePartnerCreditRequestAction(REQ_UUID);
    expect(selfRes).toEqual({
      success: false,
      error: "A second admin must approve this credit request.",
    });

    mockedAuth.mockResolvedValue({
      user: { id: "admin-2", email: "admin2@refreeg.com" },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    mockTx.partnerCreditRequest.updateMany.mockResolvedValue({ count: 0 });

    const conflictRes = await approvePartnerCreditRequestAction(REQ_UUID);
    expect(conflictRes).toEqual({
      success: false,
      error: "This credit request has already been reviewed.",
    });
  });

  it("approvePartnerCreditRequestAction activates/invites partner and sends email for second admin", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "admin-2", email: "admin2@refreeg.com" },
    });
    (prisma.partnerCreditRequest.findUnique as jest.Mock).mockResolvedValue({
      id: REQ_UUID,
      partnerId: PARTNER_UUID,
      kind: "initial_grant",
      amount: 8000000,
      reconciliationRef: "KOR-88213",
      status: "pending_approval",
      requestedById: "admin-1",
      partner: {
        id: PARTNER_UUID,
        name: "Flutterwave Foundation",
        contactEmail: "impact@flutterwave.org",
        userId: null,
        status: "pending_approval",
        expiresAt: new Date("2027-12-31T00:00:00.000Z"),
      },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    mockTx.partnerCreditRequest.updateMany.mockResolvedValue({ count: 1 });
    mockTx.partnerAccount.update.mockResolvedValue({});
    mockTx.partnerCreditTransaction.create.mockResolvedValue({});
    mockTx.logs.create.mockResolvedValue({});

    const res = await approvePartnerCreditRequestAction(REQ_UUID);

    expect(res).toEqual({ success: true });
    expect(mockTx.partnerAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PARTNER_UUID },
        data: expect.objectContaining({
          status: "invited",
          creditsIssued: { increment: 8000000 },
          approvedById: "admin-2",
        }),
      }),
    );
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "impact@flutterwave.org",
        partnerName: "Flutterwave Foundation",
        amount: 8000000,
        kind: "initial_grant",
      }),
    );
  });

  it("rejectPartnerCreditRequestAction marks initial grant and partner rejected", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "admin-2", email: "admin2@refreeg.com" },
    });
    (prisma.partnerCreditRequest.findUnique as jest.Mock).mockResolvedValue({
      id: REQ_UUID,
      partnerId: PARTNER_UUID,
      kind: "initial_grant",
      status: "pending_approval",
      requestedById: "admin-1",
    });
    mockTx.partnerCreditRequest.updateMany.mockResolvedValue({ count: 1 });
    mockTx.partnerAccount.update.mockResolvedValue({});
    mockTx.logs.create.mockResolvedValue({});

    const res = await rejectPartnerCreditRequestAction(
      REQ_UUID,
      "Unmatched wire",
    );

    expect(res).toEqual({ success: true });
    expect(mockTx.partnerAccount.update).toHaveBeenCalledWith({
      where: { id: PARTNER_UUID },
      data: {
        status: "rejected",
        rejectionReason: "Unmatched wire",
      },
    });
  });

  it("updatePartnerAccountAction preserves invited status and queues optional top up", async () => {
    (prisma.partnerAccount.findUnique as jest.Mock).mockResolvedValue({
      id: PARTNER_UUID,
      status: "invited",
      creditsIssued: 8000000,
      creditsUsed: 0,
    });
    mockTx.partnerAccount.update.mockResolvedValue({});
    mockTx.partnerCreditRequest.create.mockResolvedValue({ id: REQ_UUID });
    mockTx.logs.create.mockResolvedValue({});

    const res = await updatePartnerAccountAction(PARTNER_UUID, {
      expiresAt: "2028-01-01",
      eligibleCategories: ["education"],
      rulesNote: "Updated note",
      maxPerCampaign: "1000000",
      employeeMatchingEnabled: false,
      status: "active",
      topUpAmount: "2000000",
      topUpRef: "TOP-771",
    });

    expect(res).toEqual({ success: true });
    expect(mockTx.partnerAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "invited" }),
      }),
    );
    expect(mockTx.partnerCreditRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "top_up",
          amount: 2000000,
          reconciliationRef: "TOP-771",
        }),
      }),
    );
  });

  it("getPartnerCreditsDashboard blocks claiming unlinked partner with unverified email", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "unverified-u", email: "csr@kora.ng" },
    });
    (prisma.partnerAccount.findFirst as jest.Mock).mockResolvedValue({
      id: PARTNER_UUID,
      name: "Kora Payments",
      contactEmail: "csr@kora.ng",
      userId: null,
      status: "invited",
      creditsIssued: 5000000,
      creditsUsed: 0,
      expiresAt: new Date("2027-12-31T00:00:00.000Z"),
      eligibleCategories: ["education"],
      rulesNote: null,
      maxPerCampaign: 1000000,
      employeeMatchingEnabled: false,
      matchingRatio: "1:1",
      reconciliationRef: "KOR-1",
      partnerSince: new Date("2026-03-01T00:00:00.000Z"),
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      emailVerified: null,
    });

    const res = await getPartnerCreditsDashboard();
    expect(res).toEqual({
      success: true,
      data: {
        partner: null,
        transactions: [],
        pendingTopUpRequests: [],
        eligibleCauses: [],
      },
    });
    expect(prisma.partnerAccount.update).not.toHaveBeenCalled();
  });

  it("allocatePartnerCreditsAction blocks ineligible categories, per-campaign cap, and insufficient balance", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "partner-u1", email: "csr@kora.ng" },
    });
    (prisma.partnerAccount.findFirst as jest.Mock).mockResolvedValue({
      id: PARTNER_UUID,
      name: "Kora Payments",
      contactEmail: "csr@kora.ng",
      userId: "partner-u1",
      status: "active",
      creditsIssued: 5000000,
      creditsUsed: 3150000,
      expiresAt: new Date("2025-01-01T00:00:00.000Z"),
      eligibleCategories: ["education", "health"],
      maxPerCampaign: 1000000,
    });
    mockTx.$queryRaw.mockResolvedValue([
      {
        id: PARTNER_UUID,
        name: "Kora Payments",
        contact_email: "csr@kora.ng",
        user_id: "partner-u1",
        status: "active",
        eligible_categories: ["education", "health"],
        max_per_campaign: 1000000,
      },
    ]);

    mockTx.cause.findUnique.mockResolvedValueOnce({
      id: CAUSE_ENV_UUID,
      title: "Plant Trees",
      category: "Environment",
      status: "approved",
      paused: false,
      compliance_paused: false,
    });

    const wrongCat = await allocatePartnerCreditsAction({
      causeId: CAUSE_ENV_UUID,
      amount: "200000",
      showAsSupporter: true,
    });
    expect(wrongCat).toEqual({
      success: false,
      error: "This campaign is outside your eligible cause categories.",
    });

    mockTx.cause.findUnique.mockResolvedValueOnce({
      id: CAUSE_EDU_UUID,
      title: "Makoko Water",
      category: "Education",
      status: "approved",
      paused: false,
      compliance_paused: false,
    });
    mockTx.partnerCreditTransaction.aggregate.mockResolvedValue({
      _sum: { amount: -750000 },
    });

    const overCap = await allocatePartnerCreditsAction({
      causeId: CAUSE_EDU_UUID,
      amount: "500000",
      showAsSupporter: true,
    });
    expect(overCap.success).toBe(false);
    if (!overCap.success) {
      expect(overCap.error).toContain("per-campaign limit");
    }

    mockTx.cause.findUnique.mockResolvedValueOnce({
      id: CAUSE_EDU_UUID,
      title: "Makoko Water",
      category: "Education",
      status: "approved",
      paused: false,
      compliance_paused: false,
    });
    mockTx.partnerCreditTransaction.aggregate.mockResolvedValue({
      _sum: { amount: 0 },
    });
    mockTx.$executeRaw.mockResolvedValue(0);

    const noFunds = await allocatePartnerCreditsAction({
      causeId: CAUSE_EDU_UUID,
      amount: "500000",
      showAsSupporter: true,
    });
    expect(noFunds).toEqual({
      success: false,
      error: "Insufficient partner credits available.",
    });
  });

  it("allocatePartnerCreditsAction deducts atomically, records Donation, increments Cause.raised even with expired warning", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "partner-u1", email: "csr@kora.ng" },
    });
    (prisma.partnerAccount.findFirst as jest.Mock).mockResolvedValue({
      id: PARTNER_UUID,
      name: "Kora Payments",
      contactEmail: "csr@kora.ng",
      userId: "partner-u1",
      status: "active",
      creditsIssued: 5000000,
      creditsUsed: 3150000,
      expiresAt: new Date("2025-01-01T00:00:00.000Z"),
      eligibleCategories: ["education", "health"],
      maxPerCampaign: 1000000,
    });
    mockTx.$queryRaw.mockResolvedValue([
      {
        id: PARTNER_UUID,
        name: "Kora Payments",
        contact_email: "csr@kora.ng",
        user_id: "partner-u1",
        status: "active",
        eligible_categories: ["education", "health"],
        max_per_campaign: 1000000,
      },
    ]);
    mockTx.cause.findUnique.mockResolvedValue({
      id: CAUSE_EDU_UUID,
      title: "Clean water for Makoko",
      category: "Education",
      status: "approved",
      paused: false,
      compliance_paused: false,
    });
    mockTx.partnerCreditTransaction.aggregate.mockResolvedValue({
      _sum: { amount: 0 },
    });
    mockTx.$executeRaw.mockResolvedValue(1);
    mockTx.donation.create.mockResolvedValue({ id: "don-1" });
    mockTx.cause.update.mockResolvedValue({});
    mockTx.partnerCreditTransaction.create.mockResolvedValue({});

    const res = await allocatePartnerCreditsAction({
      causeId: CAUSE_EDU_UUID,
      amount: "500000",
      showAsSupporter: true,
    });

    expect(res).toEqual({ success: true });
    expect(mockTx.donation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          causeId: CAUSE_EDU_UUID,
          amount: 500000,
          name: "Kora Payments",
          is_anonymous: false,
          payment_provider: "partner_credit",
        }),
      }),
    );
    expect(mockTx.cause.update).toHaveBeenCalledWith({
      where: { id: CAUSE_EDU_UUID },
      data: { raised: { increment: 500000 } },
    });
    expect(mockTx.partnerCreditTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          partnerId: PARTNER_UUID,
          type: "allocation",
          amount: -500000,
          causeId: CAUSE_EDU_UUID,
          donationId: "don-1",
        }),
      }),
    );
  });

  it("requestPartnerTopUpAction creates pending top up request for active partner", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "partner-u1", email: "csr@kora.ng" },
    });
    (prisma.partnerAccount.findFirst as jest.Mock).mockResolvedValue({
      id: PARTNER_UUID,
      userId: "partner-u1",
      status: "active",
      creditsIssued: 5000000,
      creditsUsed: 5000000,
    });
    (prisma.partnerCreditRequest.create as jest.Mock).mockResolvedValue({
      id: REQ_UUID,
    });

    const res = await requestPartnerTopUpAction({
      amount: "2000000",
      reconciliationRef: "KOR-991",
      note: "Q4 top up",
    });

    expect(res).toEqual({ success: true });
    expect(prisma.partnerCreditRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        partnerId: PARTNER_UUID,
        kind: "top_up",
        amount: 2000000,
        reconciliationRef: "KOR-991",
        status: "pending_approval",
        requestedById: "partner-u1",
      }),
    });
  });
});
