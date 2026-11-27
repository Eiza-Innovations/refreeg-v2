jest.mock("@/hooks/use-payment", () => {
  const verifyPayment = jest.fn();
  return {
    usePayment: () => ({ verifyPayment, isLoading: false }),
  };
});

jest.mock("@/actions/wishlists/wishlist-actions", () => ({
  getWishlistGiftByReference: jest.fn(),
}));

import { act, render, screen } from "@testing-library/react";
import { WishlistReceived } from "@/components/wishlist/wishlist-received";
import { usePayment } from "@/hooks/use-payment";
import { getWishlistGiftByReference } from "@/actions/wishlists/wishlist-actions";

const baseProps = {
  username: "nomso",
  slug: "christmas",
  reference: "ref_1",
  provider: "paystack",
  cancelled: false,
};

const gift = {
  itemName: "A new study desk",
  amount: 5000,
  giverName: "Adaeze",
  wishlistTitle: "Nomso's Christmas Wishlist",
  sharePath: "/nomso/christmas",
  createdAt: "2026-11-25T09:30:00.000Z",
};

/** Runs the pending verification + polling chain under fake timers. */
async function runTimers(totalMs: number) {
  let elapsed = 0;
  while (elapsed < totalMs) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(200);
    });
    elapsed += 200;
  }
}

describe("WishlistReceived (post-checkout confirmation)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("shows the declined card immediately for a cancelled redirect", () => {
    render(<WishlistReceived {...baseProps} cancelled />);

    expect(
      screen.getByText("Your payment didn't go through"),
    ).toBeInTheDocument();
    expect(usePayment().verifyPayment).not.toHaveBeenCalled();
  });

  it("declines gracefully when the provider returned no reference", () => {
    localStorage.setItem("payment_amount", "5000");

    render(
      <WishlistReceived
        {...baseProps}
        reference={undefined}
        txRef={undefined}
      />,
    );

    expect(
      screen.getByText("Your payment didn't go through"),
    ).toBeInTheDocument();
    expect(screen.getByText("₦5,000")).toBeInTheDocument();
  });

  it("verifies, then restates the gift and links back to the wishlist", async () => {
    jest.useFakeTimers();
    try {
      (usePayment().verifyPayment as jest.Mock).mockResolvedValue(true);
      (getWishlistGiftByReference as jest.Mock).mockResolvedValue({
        success: true,
        data: gift,
      });

      render(<WishlistReceived {...baseProps} />);
      await runTimers(400);

      expect(screen.getByText("Your gift went through")).toBeInTheDocument();
      expect(screen.getByText("₦5,000")).toBeInTheDocument();
      expect(screen.getByText("A new study desk")).toBeInTheDocument();
      expect(screen.getByText(/^Adaeze/)).toBeInTheDocument();
      expect(usePayment().verifyPayment).toHaveBeenCalledWith(
        "ref_1",
        "paystack",
        undefined,
      );
      expect(
        screen.getByRole("link", { name: "Back to the wishlist" }),
      ).toHaveAttribute("href", "/nomso/christmas");
    } finally {
      jest.useRealTimers();
    }
  });

  it("shows the generic success card when the ledger row never appears", async () => {
    jest.useFakeTimers();
    try {
      (usePayment().verifyPayment as jest.Mock).mockResolvedValue(true);
      (getWishlistGiftByReference as jest.Mock).mockResolvedValue({
        success: false,
        error: "Gift not found",
      });

      render(<WishlistReceived {...baseProps} />);
      // Five 1.2s retries exhaust before the card stops polling.
      await runTimers(7000);

      expect(screen.getByText("Your gift went through")).toBeInTheDocument();
      expect(
        screen.getByText("It will appear on the wishlist in a moment."),
      ).toBeInTheDocument();
      expect(getWishlistGiftByReference).toHaveBeenCalledTimes(5);
    } finally {
      jest.useRealTimers();
    }
  });

  it("shows the declined card when verification fails", async () => {
    jest.useFakeTimers();
    try {
      localStorage.setItem("payment_amount", "5000");
      localStorage.setItem("payment_provider", "flutterwave");
      (usePayment().verifyPayment as jest.Mock).mockResolvedValue(false);

      // No provider param, exactly like a redirect URL that omits it: the
      // stored provider from initialization decides the declined copy.
      render(<WishlistReceived {...baseProps} provider={undefined} />);
      await runTimers(400);

      expect(
        screen.getByText("Your payment didn't go through"),
      ).toBeInTheDocument();
      // The provider name in the copy follows the stored provider.
      expect(
        screen.getByText(/Flutterwave didn't confirm this payment/),
      ).toBeInTheDocument();
      expect(screen.getByText("₦5,000")).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it("polls until the ledger row lands after a webhook-vs-redirect race", async () => {
    jest.useFakeTimers();
    try {
      (usePayment().verifyPayment as jest.Mock).mockResolvedValue(true);
      (getWishlistGiftByReference as jest.Mock)
        .mockResolvedValueOnce({ success: false, error: "Gift not found" })
        .mockResolvedValue({ success: true, data: gift });

      render(<WishlistReceived {...baseProps} />);
      await runTimers(400);
      expect(screen.getByText("Confirming your gift")).toBeInTheDocument();

      // The 1.2s retry finds the row the webhook just wrote.
      await runTimers(1400);
      expect(screen.getByText("Your gift went through")).toBeInTheDocument();
      expect(getWishlistGiftByReference).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
