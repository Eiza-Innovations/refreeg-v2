/**
 * tests/lib/wishlist-charge-processing.test.ts
 *
 * Unit tests for the wishlist branch of the Paystack charge dispatcher:
 * wishlist metadata must be recorded into the wishlist ledger before the
 * cause_id guard, with the same amount cross-check as donations.
 */

const mockRecordWishlistContribution = jest.fn();
const mockVerifyTransactionFull = jest.fn();

jest.mock("@/actions/wishlists/wishlist-actions", () => ({
  recordWishlistContribution: (...args: any[]) =>
    mockRecordWishlistContribution(...args),
}));

jest.mock("@/services/payment-provider", () => ({
  verifyTransactionFull: (...args: any[]) => mockVerifyTransactionFull(...args),
}));

jest.mock("@/lib/payments/pledge-provider", () => ({
  processPledgeAuthorizationSuccess: jest.fn(),
  processPledgeScheduledChargeSuccess: jest.fn(),
}));

jest.mock("@/actions/donations/donation-actions", () => ({
  createDonation: jest.fn(),
}));

import { processSuccessfulCharge } from "@/lib/payments/paystack-charge-processing";
import { calculateProviderFee, calculateServiceFee } from "@/lib/utils";

function expectedKoboFor(giftNaira: number): number {
  return Math.round(
    (giftNaira +
      calculateServiceFee(giftNaira) +
      calculateProviderFee(giftNaira, "paystack")) *
      100,
  );
}

describe("Paystack Charge Processing - Wishlist Branch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("records a wishlist contribution from wishlist metadata without any cause_id", async () => {
    mockVerifyTransactionFull.mockResolvedValue({
      status: "success",
      amount: expectedKoboFor(2000),
      metadata: {
        wishlist_item_id: "item-123",
        user_id: "giver-456",
        amount: 2000,
        customer_name: "Ada",
        email: "ada@example.com",
        is_anonymous: false,
      },
    });

    const result = await processSuccessfulCharge("wish_ref_001");

    expect(result).toEqual({
      ok: true,
      reason: "wishlist_contribution_created",
    });
    expect(mockRecordWishlistContribution).toHaveBeenCalledWith(
      "item-123",
      "giver-456",
      expect.objectContaining({ amount: 2000, email: "ada@example.com" }),
      "wish_ref_001",
      "paystack",
    );
  });

  it("passes null giver id for guest gifts", async () => {
    mockVerifyTransactionFull.mockResolvedValue({
      status: "success",
      amount: expectedKoboFor(5000),
      metadata: {
        wishlist_item_id: "item-123",
        amount: 5000,
        email: "guest@example.com",
      },
    });

    const result = await processSuccessfulCharge("wish_ref_002");

    expect(result.ok).toBe(true);
    expect(mockRecordWishlistContribution).toHaveBeenCalledWith(
      "item-123",
      null,
      expect.objectContaining({ amount: 5000 }),
      "wish_ref_002",
      "paystack",
    );
  });

  it("refuses to record a contribution when the charged amount differs from metadata", async () => {
    mockVerifyTransactionFull.mockResolvedValue({
      status: "success",
      amount: expectedKoboFor(5000) + 1000_00,
      metadata: {
        wishlist_item_id: "item-123",
        amount: 5000,
        email: "guest@example.com",
      },
    });

    const result = await processSuccessfulCharge("wish_ref_003");

    expect(result).toEqual({ ok: false, reason: "amount_mismatch" });
    expect(mockRecordWishlistContribution).not.toHaveBeenCalled();
  });

  it("does not treat a wishlist charge as a donation", async () => {
    const { createDonation } =
      await import("@/actions/donations/donation-actions");
    mockVerifyTransactionFull.mockResolvedValue({
      status: "success",
      amount: expectedKoboFor(1000),
      metadata: {
        wishlist_item_id: "item-123",
        amount: 1000,
        email: "guest@example.com",
      },
    });

    await processSuccessfulCharge("wish_ref_004");

    expect(createDonation).not.toHaveBeenCalled();
  });
});
