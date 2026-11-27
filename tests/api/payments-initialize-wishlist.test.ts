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

jest.mock("@/lib/prisma", () => ({
  prisma: {
    cause: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    wishlist_items: {
      findUnique: jest.fn(),
    },
    wishlist_contributions: {
      aggregate: jest.fn(),
    },
  },
}));

jest.mock("@/services/flutterwave", () => ({
  __esModule: true,
  default: {
    listBanks: jest.fn(),
    getBankCode: jest.fn(),
    createSubaccount: jest.fn(),
    findSubaccountByAccountNumber: jest.fn(),
    initializeTransaction: jest.fn(),
  },
}));

jest.mock("@/services/payment-provider", () => ({
  initializeTransaction: jest.fn(),
}));

import { POST } from "@/app/api/payments/initialize/route";
import { prisma } from "@/lib/prisma";
import Flutterwave from "@/services/flutterwave";
import { initializeTransaction } from "@/services/payment-provider";
import { calculateProviderFee, calculateServiceFee } from "@/lib/utils";

const verifiedOwner = {
  id: "owner-1",
  fullName: "Nomso Okeke",
  username: "nomso",
  email: "nomso@example.com",
  subAccountCode: "ACCT_paystack_1",
  flutterwaveSubAccountId: null,
  accountNumber: "1234567890",
  bankName: "Access Bank",
};

function itemRow(overrides: Record<string, unknown> = {}) {
  return {
    price: 80000,
    contributed: 52400,
    funded_at: null,
    wishlist: { status: "active", user: verifiedOwner },
    ...overrides,
  };
}

const unverifiedOwner = { ...verifiedOwner, subAccountCode: null };

function makeRequest(payload: Record<string, unknown>) {
  return { json: jest.fn().mockResolvedValue(payload) } as any;
}

async function post(payload: Record<string, unknown>) {
  const res = await POST(makeRequest(payload));
  return { status: res.status, body: await res.json() };
}

const basePayload = {
  amount: 5000,
  email: "giver@example.com",
  wishlistItemId: "item-9",
  id: "giver-1",
  full_name: "Adaeze",
  paymentProvider: "paystack",
  subaccounts: [],
  message: "Merry Christmas!",
  isAnonymous: false,
  callbackUrl: "https://refreeg.com/nomso/christmas/received",
};

describe("POST /api/payments/initialize — wishlist gifts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (initializeTransaction as jest.Mock).mockResolvedValue({
      authorization_url: "https://checkout.paystack.com/abc",
      reference: "ref_1",
      access_code: "acc_1",
    });
  });

  it("rejects a payload that targets neither a cause nor a wishlist item", async () => {
    const res = await post({ amount: 5000, email: "giver@example.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Missing required fields");
    expect(initializeTransaction).not.toHaveBeenCalled();
  });

  it("rejects an ambiguous payload targeting both ledgers", async () => {
    const res = await post({
      ...basePayload,
      causeId: "cause-1",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Ambiguous payment target");
  });

  it("refuses a funded item with the guard's message", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow({ funded_at: new Date() }),
    );

    const res = await post(basePayload);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("This item is already fully funded.");
    expect(initializeTransaction).not.toHaveBeenCalled();
  });

  it("hard-refuses a gift that would overshoot the item's goal", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow(),
    );

    const res = await post({ ...basePayload, amount: 30000 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("This item only needs ₦27,600 more.");
    expect(initializeTransaction).not.toHaveBeenCalled();
  });

  it("refuses at the ₦500k collection cap for an unverified owner", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow({ wishlist: { status: "active", user: unverifiedOwner } }),
    );
    (prisma.wishlist_contributions.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: 498000 },
    });

    const res = await post({ ...basePayload, amount: 3000 });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("₦500,000 collection cap");
    expect(initializeTransaction).not.toHaveBeenCalled();
  });

  it("attaches the owner's paystack subaccount and recomputes fees server-side", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow(),
    );

    const res = await post({
      ...basePayload,
      // Spoofed numbers from a tampered client must be replaced.
      serviceFee: 99999,
      providerFee: 1,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        wishlistItemId: "item-9",
        callbackUrl: basePayload.callbackUrl,
        serviceFee: calculateServiceFee(5000),
        providerFee: calculateProviderFee(5000, "paystack"),
        subaccounts: [{ subaccount: "ACCT_paystack_1", share: 500000 }],
      }),
      "paystack",
    );
  });

  it("splits to the platform account when the owner has no payout details", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow({ wishlist: { status: "active", user: unverifiedOwner } }),
    );
    (prisma.wishlist_contributions.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: 0 },
    });

    const res = await post(basePayload);

    expect(res.status).toBe(200);
    expect(initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ subaccounts: [] }),
      "paystack",
    );
  });

  it("splits to an existing Flutterwave subaccount without re-creating one", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow({
        wishlist: {
          status: "active",
          user: {
            ...verifiedOwner,
            flutterwaveSubAccountId: "RS_flw_existing",
          },
        },
      }),
    );

    const res = await post({
      ...basePayload,
      paymentProvider: "flutterwave",
    });

    expect(res.status).toBe(200);
    expect(Flutterwave.createSubaccount).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        subaccounts: [{ subaccount: "RS_flw_existing", share: 500000 }],
      }),
      "flutterwave",
    );
  });

  it("JIT-creates the Flutterwave subaccount for a paystack-verified owner", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow(),
    );
    (Flutterwave.getBankCode as jest.Mock).mockResolvedValue("044");
    (Flutterwave.createSubaccount as jest.Mock).mockResolvedValue({
      subaccount_id: "RS_flw_new",
    });

    const res = await post({
      ...basePayload,
      paymentProvider: "flutterwave",
    });

    expect(res.status).toBe(200);
    expect(Flutterwave.createSubaccount).toHaveBeenCalledWith(
      expect.objectContaining({
        account_number: "1234567890",
        business_name: "Nomso Okeke",
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "owner-1" },
        data: { flutterwaveSubAccountId: "RS_flw_new" },
      }),
    );
    expect(initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        subaccounts: [{ subaccount: "RS_flw_new", share: 500000 }],
      }),
      "flutterwave",
    );
  });

  it("never consults the cause tables on the wishlist path", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow(),
    );

    await post(basePayload);

    expect(prisma.cause.findUnique).not.toHaveBeenCalled();
  });
});
