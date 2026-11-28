import { POST } from "@/app/api/payments/verify/route";
import Flutterwave from "@/services/flutterwave";
import { createDonation } from "@/actions/donations/donation-actions";
import { calculateProviderFee, calculateServiceFee } from "@/lib/utils";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => {
      return {
        json: async () => body,
        status: init?.status || 200,
      };
    }),
  },
}));

jest.mock("@/services/paystack", () => ({
  __esModule: true,
  default: { verifyTransactionFull: jest.fn() },
}));

jest.mock("@/lib/campaign-analytics/funnel-server", () => ({
  recordPaymentOutcome: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/payments/paystack-charge-processing", () => ({
  processSuccessfulCharge: jest.fn(),
}));

jest.mock("@/actions/donations/donation-actions", () => ({
  createDonation: jest.fn(),
}));

jest.mock("@/actions/wishlists/wishlist-actions", () => ({
  recordWishlistContribution: jest.fn(),
}));

const mockApi = {
  post: jest.fn(),
  get: jest.fn(),
};

Flutterwave.api = mockApi as any;

function verifyRequest(body: Record<string, unknown>) {
  return { json: async () => body } as any;
}

describe("POST /api/payments/verify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns verified false when a cancelled Flutterwave reference has no transaction", async () => {
    mockApi.get.mockRejectedValueOnce({
      response: { status: 400, data: { message: "No transaction" } },
      message: "Request failed with status code 400",
    });

    const response = await POST(
      verifyRequest({
        reference: "flw_cancelled",
        provider: "flutterwave",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, verified: false });
    expect(mockApi.get).toHaveBeenCalledWith(
      "/transactions/verify_by_reference?tx_ref=flw_cancelled",
    );
  });

  it("returns verified false when Flutterwave answers 404", async () => {
    mockApi.get.mockRejectedValueOnce({
      response: { status: 404 },
      message: "Request failed with status code 404",
    });

    const response = await POST(
      verifyRequest({
        reference: "flw_missing",
        provider: "flutterwave",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, verified: false });
  });

  it("returns verified false when the transaction exists but was not successful", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: { status: "failed", id: 4 } },
    });

    const response = await POST(
      verifyRequest({
        reference: "flw_failed",
        provider: "flutterwave",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, verified: false });
  });

  it("returns 500 when Flutterwave rejects the key", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockApi.get.mockRejectedValueOnce({
      response: { status: 401 },
      message: "Request failed with status code 401",
    });

    const response = await POST(
      verifyRequest({
        reference: "flw_cancelled",
        provider: "flutterwave",
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Request failed with status code 401",
      success: false,
    });
    errorSpy.mockRestore();
  });

  it("returns 500 when Flutterwave cannot be reached", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockApi.get.mockRejectedValueOnce(new Error("Network Error"));

    const response = await POST(
      verifyRequest({
        reference: "flw_cancelled",
        provider: "flutterwave",
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Network Error",
      success: false,
    });
    errorSpy.mockRestore();
  });

  it("verifies and records a successful Flutterwave donation with amount validation and boolean parsing", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        data: {
          status: "successful",
          id: 42,
          tx_ref: "flw_ok",
          currency: "NGN",
          amount:
            2000 +
            calculateServiceFee(2000) +
            calculateProviderFee(2000, "flutterwave"),
          customer: { email: "donor@example.com" },
          meta: {
            cause_id: "c9",
            amount: "2000",
            customer_name: "Ada",
            is_anonymous: "false",
          },
        },
      },
    });

    const response = await POST(
      verifyRequest({
        reference: "flw_ok",
        provider: "flutterwave",
        transaction_id: "42",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, verified: true });
    expect(mockApi.get).toHaveBeenCalledWith("/transactions/42/verify");
    expect(createDonation).toHaveBeenCalledWith(
      "c9",
      null,
      expect.objectContaining({
        amount: 2000,
        email: "donor@example.com",
        isAnonymous: false,
      }),
      undefined,
      "flw_ok",
      "flutterwave",
      undefined,
    );
  });

  it("rejects non-numeric transaction_id before calling Flutterwave API", async () => {
    const response = await POST(
      verifyRequest({
        reference: "flw_ok",
        provider: "flutterwave",
        transaction_id: "../subaccounts",
      }),
    );

    expect(response.status).toBe(400);
    expect(mockApi.get).not.toHaveBeenCalled();
  });

  it("returns verified false when charge fails amount or reference validation", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockApi.get.mockResolvedValueOnce({
      data: {
        data: {
          status: "successful",
          id: 42,
          tx_ref: "flw_different",
          currency: "NGN",
          amount: 100,
          meta: { cause_id: "c9", amount: "2000" },
        },
      },
    });

    const response = await POST(
      verifyRequest({
        reference: "flw_ok",
        provider: "flutterwave",
        transaction_id: "42",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, verified: false });
    expect(createDonation).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
