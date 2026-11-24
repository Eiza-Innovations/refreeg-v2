const mockTx = {
  $queryRaw: jest.fn(),
  user: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  cause: { findFirst: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
  kyc_verifications: { findMany: jest.fn(), deleteMany: jest.fn() },
  petitions: { findMany: jest.fn(), deleteMany: jest.fn() },
  pledges: { findMany: jest.fn(), updateMany: jest.fn() },
  subscriptions: { findMany: jest.fn(), updateMany: jest.fn() },
  organization: { findUnique: jest.fn(), deleteMany: jest.fn() },
  organizationMember: { deleteMany: jest.fn() },
  organizationInvitation: { deleteMany: jest.fn() },
  savedList: { deleteMany: jest.fn() },
  userAlertPrefs: { deleteMany: jest.fn() },
  pendingRegistration: { deleteMany: jest.fn() },
  passwordResetToken: { deleteMany: jest.fn() },
  verificationToken: { deleteMany: jest.fn() },
  donation: { updateMany: jest.fn() },
  crypto_donations: { updateMany: jest.fn() },
  donorReferralAttribution: { updateMany: jest.fn() },
  device_tokens: { deleteMany: jest.fn() },
  user_saved_cards: { deleteMany: jest.fn() },
  notifications: { deleteMany: jest.fn() },
  bookmark: { deleteMany: jest.fn() },
  saved_searches: { deleteMany: jest.fn() },
  content_reports: { updateMany: jest.fn() },
  user_blocks: { deleteMany: jest.fn() },
  campaign_follows: { deleteMany: jest.fn() },
  cause_shares: { deleteMany: jest.fn() },
  userStreak: { deleteMany: jest.fn() },
  userWallet: { deleteMany: jest.fn() },
  rewardTransaction: { deleteMany: jest.fn() },
  eiza_transactions: { deleteMany: jest.fn() },
  events: { deleteMany: jest.fn() },
  referral: { deleteMany: jest.fn() },
  referrals_v1: { deleteMany: jest.fn() },
  api_webhooks: { findMany: jest.fn(), deleteMany: jest.fn() },
  api_webhook_logs: { deleteMany: jest.fn() },
  api_keys: { deleteMany: jest.fn() },
  api_bank_accounts: { deleteMany: jest.fn() },
  api_request_logs: { updateMany: jest.fn() },
  api_campaigns: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
  },
  api_donations: { findMany: jest.fn() },
  comments: { deleteMany: jest.fn() },
  petition_comments: { deleteMany: jest.fn() },
  signatures: { deleteMany: jest.fn(), updateMany: jest.fn() },
  cause_edits: { findMany: jest.fn(), deleteMany: jest.fn() },
  cause_edit_sections: { deleteMany: jest.fn() },
  petition_edits: { findMany: jest.fn(), deleteMany: jest.fn() },
  petition_edit_sections: { deleteMany: jest.fn() },
  petition_sections: { deleteMany: jest.fn() },
  cause_sections: { deleteMany: jest.fn() },
  campaign_proof_updates: { deleteMany: jest.fn() },
  campaign_proof_requirements: { deleteMany: jest.fn() },
  session: { deleteMany: jest.fn() },
  account: { deleteMany: jest.fn() },
  role: { deleteMany: jest.fn() },
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
      cb(mockTx),
    ),
  },
}));

jest.mock("@/lib/s3/s3-utils", () => ({
  deleteUserPersonalS3Files: jest.fn(),
}));

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteUserPersonalS3Files } from "@/lib/s3/s3-utils";
import {
  DATA_RETENTION_POLICY,
  buildAnonymizedEmail,
} from "@/lib/config/retention";
import { executeUserAccountDeletion } from "@/lib/auth/account-deletion";

const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
const TEST_BARE_DIDIT_SESSION_ID = "22222222-2222-4222-8222-222222222222";
const mockPrisma = prisma as unknown as {
  $transaction: jest.Mock;
};
const mockDeleteS3 = deleteUserPersonalS3Files as jest.Mock;

describe("executeUserAccountDeletion", () => {
  const originalFetch = global.fetch;
  const originalDiditKey = process.env.DIDIT_API_KEY;
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DIDIT_API_KEY = "didit-test-key";
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    mockDeleteS3.mockResolvedValue(undefined);

    mockTx.$queryRaw.mockResolvedValue([{ id: TEST_USER_ID }]);
    mockTx.user.findUnique.mockResolvedValue({
      id: TEST_USER_ID,
      email: "User@Example.com",
      profilePhoto: `uploads/profiles/${TEST_USER_ID}/avatar.png`,
    });
    mockTx.cause.findFirst.mockResolvedValue(null);
    mockTx.kyc_verifications.findMany.mockResolvedValue([]);
    mockTx.cause.findMany.mockResolvedValue([]);
    mockTx.petitions.findMany.mockResolvedValue([]);
    mockTx.organization.findUnique.mockResolvedValue(null);
    mockTx.api_webhooks.findMany.mockResolvedValue([]);
    mockTx.api_campaigns.findMany.mockResolvedValue([]);
    mockTx.pledges.findMany.mockResolvedValue([]);
    mockTx.subscriptions.findMany.mockResolvedValue([]);
    mockTx.api_donations.findMany.mockResolvedValue([]);
    mockTx.cause_edits.findMany.mockResolvedValue([]);
    mockTx.petition_edits.findMany.mockResolvedValue([]);
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalDiditKey === undefined) {
      delete process.env.DIDIT_API_KEY;
    } else {
      process.env.DIDIT_API_KEY = originalDiditKey;
    }
  });

  it("returns 400 when userId is empty or invalid UUID", async () => {
    expect(await executeUserAccountDeletion("")).toEqual({
      success: false,
      statusCode: 400,
      error: "User ID is required",
      code: "MISSING_USER_ID",
    });

    expect(await executeUserAccountDeletion("not-a-uuid")).toEqual({
      success: false,
      statusCode: 400,
      error: "Invalid user ID format",
      code: "INVALID_USER_ID",
    });
  });

  it("returns 404 when the user does not exist", async () => {
    mockTx.user.findUnique.mockResolvedValue(null);

    const result = await executeUserAccountDeletion(TEST_USER_ID);
    expect(result).toEqual({
      success: false,
      statusCode: 404,
      error: "Account not found",
      code: "USER_NOT_FOUND",
    });
    expect(mockDeleteS3).not.toHaveBeenCalled();
  });

  it("blocks deletion with 409 when user has an active, unpaused funded campaign", async () => {
    mockTx.cause.findFirst.mockResolvedValue({
      id: "cause-active",
      title: "Community Borehole",
    });

    const result = await executeUserAccountDeletion(TEST_USER_ID);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(409);
    expect(result.code).toBe("ACTIVE_FUNDED_CAMPAIGN");
    expect(result.error).toContain("Community Borehole");
    expect(result.error).toContain(DATA_RETENTION_POLICY.SUPPORT_EMAIL);
    expect(mockDeleteS3).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("commits DB cleanup first (including api_webhook_logs and case-insensitive anonymization), then purges S3 and Didit", async () => {
    const callOrder: string[] = [];
    mockTx.user.delete.mockImplementation(async () => {
      callOrder.push("db_delete");
      return {};
    });
    mockDeleteS3.mockImplementation(async () => {
      callOrder.push("s3_delete");
    });
    mockFetch.mockImplementation(async () => {
      callOrder.push("didit_delete");
      return { ok: true, status: 200 };
    });

    mockTx.kyc_verifications.findMany.mockResolvedValue([
      {
        document_type: "didit",
        document_url: `session-abc:::uploads/kyc/${TEST_USER_ID}/doc-1.png`,
      },
      {
        document_type: "didit",
        document_url: TEST_BARE_DIDIT_SESSION_ID,
      },
    ]);
    mockTx.organization.findUnique.mockResolvedValue({
      logoUrl: `uploads/organizations/${TEST_USER_ID}/logo.png`,
    });
    mockTx.api_webhooks.findMany.mockResolvedValue([{ id: "webhook-1" }]);
    mockTx.cause.findMany.mockResolvedValue([
      {
        id: "cause-unfunded",
        image: `uploads/causes/${TEST_USER_ID}/cover.jpg`,
        multimedia: [`uploads/causes/${TEST_USER_ID}/extra.jpg`],
        raised: 0,
        _count: { donations: 0, crypto_donations: 0 },
      },
    ]);
    mockTx.petitions.findMany.mockResolvedValue([
      {
        id: "pet-1",
        image: `uploads/petitions/${TEST_USER_ID}/pet.jpg`,
        multimedia: [],
      },
    ]);

    const result = await executeUserAccountDeletion(TEST_USER_ID);

    expect(result).toEqual({ success: true, statusCode: 200 });
    expect(callOrder[0]).toBe("db_delete");
    expect(callOrder).toEqual(
      expect.arrayContaining(["db_delete", "didit_delete", "s3_delete"]),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "https://verification.didit.me/v3/session/session-abc/",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ "x-api-key": "didit-test-key" }),
      }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      `https://verification.didit.me/v3/session/${TEST_BARE_DIDIT_SESSION_ID}/`,
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(mockDeleteS3).toHaveBeenCalledWith(TEST_USER_ID, [
      `uploads/profiles/${TEST_USER_ID}/avatar.png`,
      `uploads/organizations/${TEST_USER_ID}/logo.png`,
      `uploads/kyc/${TEST_USER_ID}/doc-1.png`,
      `uploads/causes/${TEST_USER_ID}/cover.jpg`,
      `uploads/causes/${TEST_USER_ID}/extra.jpg`,
      `uploads/petitions/${TEST_USER_ID}/pet.jpg`,
    ]);

    const expectedEmail = buildAnonymizedEmail(TEST_USER_ID);
    expect(mockTx.donation.updateMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { userId: TEST_USER_ID },
          { email: { equals: "User@Example.com", mode: "insensitive" } },
        ],
      },
      data: {
        userId: null,
        name: DATA_RETENTION_POLICY.DELETED_ACCOUNT_DISPLAY_NAME,
        email: expectedEmail,
        message: null,
        is_anonymous: true,
      },
    });
    expect(mockTx.api_webhook_logs.deleteMany).toHaveBeenCalledWith({
      where: { webhook_id: { in: ["webhook-1"] } },
    });
    expect(mockTx.api_webhooks.deleteMany).toHaveBeenCalledWith({
      where: { user_id: TEST_USER_ID },
    });
    expect(mockTx.organization.deleteMany).toHaveBeenCalledWith({
      where: { ownerId: TEST_USER_ID },
    });
    expect(mockTx.pendingRegistration.deleteMany).toHaveBeenCalledWith({
      where: { email: { equals: "User@Example.com", mode: "insensitive" } },
    });
    expect(mockTx.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { email: { equals: "User@Example.com", mode: "insensitive" } },
    });
    expect(mockTx.content_reports.updateMany).toHaveBeenCalledWith({
      where: { reporter_id: TEST_USER_ID },
      data: { reporter_id: null },
    });
    expect(mockTx.user_blocks.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { blocker_user_id: TEST_USER_ID },
          { blocked_user_id: TEST_USER_ID },
        ],
      },
    });
    expect(mockTx.user.delete).toHaveBeenCalledWith({
      where: { id: TEST_USER_ID },
    });
  });

  it("scrubs user into a blocked tombstone when historical funded causes exist", async () => {
    mockTx.cause.findMany.mockResolvedValue([
      {
        id: "cause-funded-closed",
        image: `uploads/causes/${TEST_USER_ID}/keep-me.jpg`,
        multimedia: [],
        raised: 25000,
        _count: { donations: 3, crypto_donations: 0 },
      },
    ]);

    const result = await executeUserAccountDeletion(TEST_USER_ID);

    expect(result).toEqual({ success: true, statusCode: 200 });
    expect(mockTx.cause.deleteMany).not.toHaveBeenCalled();
    expect(mockTx.user.delete).not.toHaveBeenCalled();
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: TEST_USER_ID },
      data: expect.objectContaining({
        email: buildAnonymizedEmail(TEST_USER_ID),
        fullName: DATA_RETENTION_POLICY.DELETED_ACCOUNT_DISPLAY_NAME,
        location: null,
        website: null,
        gender: null,
        crypto_wallets: Prisma.DbNull,
        interests: [],
        isVerified: false,
        isBlocked: true,
        sessions_invalidated_after: expect.any(Date),
      }),
    });
  });

  it("returns 500 and never deletes S3/Didit if the transaction throws", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockPrisma.$transaction.mockRejectedValueOnce(new Error("DB timeout"));

    const result = await executeUserAccountDeletion(TEST_USER_ID);

    expect(result).toEqual({
      success: false,
      statusCode: 500,
      error: "Failed to delete account. Please try again or contact support.",
      code: "DELETION_FAILED",
    });
    expect(mockDeleteS3).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
