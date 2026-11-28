import { createDonation } from "@/actions/donations/donation-actions";
import { recordWishlistContribution } from "@/actions/wishlists/wishlist-actions";
import {
  processPledgeAuthorizationSuccess,
  processPledgeScheduledChargeSuccess,
} from "@/lib/payments/pledge-provider";
import Flutterwave from "@/services/flutterwave";
import { calculateProviderFee, calculateServiceFee } from "@/lib/utils";
import { POST } from "@/app/api/webhooks/flutterwave/route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      body,
      status: init?.status || 200,
      json: async () => body,
    })),
  },
  NextRequest: class {},
}));

jest.mock("@/actions/donations/donation-actions", () => ({
  createDonation: jest.fn(),
}));

jest.mock("@/actions/wishlists/wishlist-actions", () => ({
  recordWishlistContribution: jest.fn(),
}));

jest.mock("@/services/flutterwave", () => ({
  __esModule: true,
  default: {
    verifyTransactionFull: jest.fn(),
    verifyByReferenceFull: jest.fn(),
  },
}));

jest.mock("@/lib/payments/pledge-provider", () => ({
  processPledgeAuthorizationSuccess: jest.fn(),
  processPledgeScheduledChargeSuccess: jest.fn(),
}));

async function flushBackgroundTasks() {
  for (let i = 0; i < 4; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("Flutterwave Webhook", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, FLUTTERWAVE_WEBHOOK_HASH: "secret-hash" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const mockRequest = (body: unknown, hash: string | null = "secret-hash") => {
    return {
      text: jest
        .fn()
        .mockResolvedValue(
          typeof body === "string" ? body : JSON.stringify(body),
        ),
      headers: {
        get: (name: string) => (name === "verif-hash" ? hash : null),
      },
    } as any;
  };

  it("should reject if webhook hash is missing", async () => {
    const req = mockRequest({}, "");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid webhook hash");
  });

  it("should reject if webhook hash is invalid", async () => {
    const req = mockRequest({}, "wrong-hash");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 500 when secret hash env var is missing", async () => {
    delete process.env.FLUTTERWAVE_WEBHOOK_HASH;
    const req = mockRequest({ event: "charge.completed" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("should return 400 for malformed JSON payloads", async () => {
    const req = mockRequest("{not-valid-json");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON payload");
  });

  it("should acknowledge charge.completed immediately with 200 and create donation with exact isAnonymous=false", async () => {
    const req = mockRequest({
      event: "charge.completed",
      data: { tx_ref: "flw_123" },
    });

    (Flutterwave.verifyByReferenceFull as jest.Mock).mockResolvedValueOnce({
      status: "successful",
      tx_ref: "flw_123",
      currency: "NGN",
      amount:
        1000 +
        calculateServiceFee(1000) +
        calculateProviderFee(1000, "flutterwave"),
      customer: { email: "fallback@test.com" },
      meta: {
        cause_id: "c1",
        user_id: "u1",
        amount: "1000",
        customer_name: "Test",
        email: "test@test.com",
        is_anonymous: "false",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await flushBackgroundTasks();

    expect(Flutterwave.verifyByReferenceFull).toHaveBeenCalledWith("flw_123");
    expect(createDonation).toHaveBeenCalledWith(
      "c1",
      "u1",
      expect.objectContaining({
        amount: 1000,
        email: "test@test.com",
        isAnonymous: false,
      }),
      undefined,
      "flw_123",
      "flutterwave",
      undefined,
    );
  });

  it("should pass meta.ref_v1 and customer email fallback when meta.email is empty", async () => {
    const req = mockRequest({
      event: "charge.completed",
      data: { id: 98765, tx_ref: "flw_456" },
    });

    (Flutterwave.verifyTransactionFull as jest.Mock).mockResolvedValueOnce({
      status: "successful",
      tx_ref: "flw_456",
      currency: "NGN",
      amount:
        2500 +
        calculateServiceFee(2500) +
        calculateProviderFee(2500, "flutterwave"),
      customer: { email: "donor@test.com" },
      meta: {
        cause_id: "c2",
        user_id: "u2",
        amount: "2500",
        customer_name: "Donor",
        email: "",
        is_anonymous: "true",
        ref_v1: "REF_DONOR_123",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await flushBackgroundTasks();

    expect(Flutterwave.verifyTransactionFull).toHaveBeenCalledWith("98765");
    expect(createDonation).toHaveBeenCalledWith(
      "c2",
      "u2",
      expect.objectContaining({
        amount: 2500,
        email: "donor@test.com",
        isAnonymous: true,
      }),
      undefined,
      "flw_456",
      "flutterwave",
      "REF_DONOR_123",
    );
  });

  it("should process wishlist_item_id contributions", async () => {
    const req = mockRequest({
      event: "charge.completed",
      data: { tx_ref: "flw_wish_1" },
    });

    (Flutterwave.verifyByReferenceFull as jest.Mock).mockResolvedValueOnce({
      status: "successful",
      tx_ref: "flw_wish_1",
      currency: "NGN",
      amount:
        5000 +
        calculateServiceFee(5000) +
        calculateProviderFee(5000, "flutterwave"),
      customer: { email: "wisher@test.com" },
      meta: {
        wishlist_item_id: "w1",
        amount: "5000",
        customer_name: "Wisher",
        email: "wisher@test.com",
        is_anonymous: "false",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await flushBackgroundTasks();

    expect(recordWishlistContribution).toHaveBeenCalledWith(
      "w1",
      null,
      expect.objectContaining({
        amount: 5000,
        email: "wisher@test.com",
        isAnonymous: false,
      }),
      "flw_wish_1",
      "flutterwave",
    );
    expect(createDonation).not.toHaveBeenCalled();
  });

  it("should reject charge.completed if verified amount mismatches metadata total", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const req = mockRequest({
      event: "charge.completed",
      data: { tx_ref: "flw_tamper" },
    });

    (Flutterwave.verifyByReferenceFull as jest.Mock).mockResolvedValueOnce({
      status: "successful",
      tx_ref: "flw_tamper",
      currency: "NGN",
      amount: 100, // tampered / mismatched
      meta: {
        cause_id: "c1",
        amount: "5000",
        email: "donor@test.com",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await flushBackgroundTasks();

    expect(createDonation).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("should ignore charge.completed if verified tx_ref does not match webhook tx_ref", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const req = mockRequest({
      event: "charge.completed",
      data: { id: 111, tx_ref: "flw_A" },
    });

    (Flutterwave.verifyTransactionFull as jest.Mock).mockResolvedValueOnce({
      status: "successful",
      tx_ref: "flw_B",
      currency: "NGN",
      amount:
        1000 +
        calculateServiceFee(1000) +
        calculateProviderFee(1000, "flutterwave"),
      meta: {
        cause_id: "c1",
        amount: "1000",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await flushBackgroundTasks();

    expect(createDonation).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("should ignore charge.completed if verify fails", async () => {
    const req = mockRequest({
      event: "charge.completed",
      data: { tx_ref: "flw_123" },
    });

    (Flutterwave.verifyByReferenceFull as jest.Mock).mockResolvedValueOnce({
      status: "failed",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await flushBackgroundTasks();
    expect(createDonation).not.toHaveBeenCalled();
  });

  it("should return 400 on empty body or missing tx_ref and 200 on unsupported events", async () => {
    const emptyReq = {
      text: jest.fn().mockResolvedValue(""),
      headers: { get: () => "secret-hash" },
    } as any;
    expect((await POST(emptyReq)).status).toBe(400);

    const noRefReq = mockRequest({
      event: "charge.completed",
      data: { tx_ref: "   " },
    });
    expect((await POST(noRefReq)).status).toBe(400);

    const otherReq = mockRequest({ event: "transfer.completed", data: {} });
    expect((await POST(otherReq)).status).toBe(200);
  });

  it("should ignore charge.completed on non-NGN currency", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const req = mockRequest({
      event: "charge.completed",
      data: { tx_ref: "flw_usd" },
    });

    (Flutterwave.verifyByReferenceFull as jest.Mock).mockResolvedValueOnce({
      status: "successful",
      tx_ref: "flw_usd",
      currency: "USD",
      amount:
        1000 +
        calculateServiceFee(1000) +
        calculateProviderFee(1000, "flutterwave"),
      meta: { cause_id: "c1", amount: "1000" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await flushBackgroundTasks();
    expect(createDonation).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("should route pledge_flow authorization and scheduled_charge payloads", async () => {
    const authReq = mockRequest({
      event: "charge.completed",
      data: { tx_ref: "flw_pledge_auth" },
    });
    (Flutterwave.verifyByReferenceFull as jest.Mock).mockResolvedValueOnce({
      status: "successful",
      tx_ref: "flw_pledge_auth",
      currency: "NGN",
      meta: { pledge_flow: "authorization" },
    });

    expect((await POST(authReq)).status).toBe(200);
    await flushBackgroundTasks();
    expect(processPledgeAuthorizationSuccess).toHaveBeenCalledWith(
      "flw_pledge_auth",
      "flutterwave",
    );

    const schedReq = mockRequest({
      event: "charge.completed",
      data: { tx_ref: "flw_pledge_sched" },
    });
    (Flutterwave.verifyByReferenceFull as jest.Mock).mockResolvedValueOnce({
      status: "successful",
      tx_ref: "flw_pledge_sched",
      currency: "NGN",
      meta: { pledge_flow: "scheduled_charge" },
    });

    expect((await POST(schedReq)).status).toBe(200);
    await flushBackgroundTasks();
    expect(processPledgeScheduledChargeSuccess).toHaveBeenCalledWith(
      "flw_pledge_sched",
      "flutterwave",
    );
  });
});
