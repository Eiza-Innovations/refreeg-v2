jest.mock("@/hooks/use-payment", () => {
  const initializePayment = jest.fn();
  return {
    usePayment: () => ({ initializePayment, isLoading: false }),
  };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { ContributeSheet } from "@/components/wishlist/contribute-sheet";
import { usePayment } from "@/hooks/use-payment";
import { calculateProviderFee, calculateServiceFee } from "@/lib/utils";
import type { WishlistItem } from "@/types";

const naira = (n: number) => `₦${n.toLocaleString()}`;
const totalFor = (amount: number, provider: "paystack" | "flutterwave") =>
  amount + calculateServiceFee(amount) + calculateProviderFee(amount, provider);

const item: WishlistItem = {
  id: "item-9",
  wishlist_id: "w-1",
  name: "A new study desk",
  price: 80_000,
  contributed: 52_400,
  note: null,
  sort_order: 0,
  funded_at: null,
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
};

const renderSheet = (
  props: Partial<Parameters<typeof ContributeSheet>[0]> = {},
) =>
  render(
    <ContributeSheet
      item={item}
      wishlistTitle="Nomso's Wishlist"
      wishlistSlug="nomsos-wishlist"
      ownerUsername="nomso"
      open
      onOpenChange={jest.fn()}
      viewer={null}
      {...props}
    />,
  );

describe("ContributeSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("disables review below the minimum amount", () => {
    renderSheet({
      viewer: { id: "u-1", name: "Adaeze", email: "adaeze@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Other" }));
    fireEvent.change(screen.getByLabelText("Amount in naira"), {
      target: { value: "50" },
    });

    // Below the ₦100 floor the review step cannot start at all.
    expect(screen.getByRole("button", { name: "Review gift" })).toBeDisabled();
  });

  it("suppresses the name field for anonymous guests and requires it otherwise", () => {
    renderSheet();

    // Guest, not anonymous yet: the name field is present.
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Give anonymously" }));

    // Anonymous: the name field hides; only the receipt email stays.
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email for your receipt")).toBeInTheDocument();
  });

  it("restates the exact amount, item and giver on the confirm step", () => {
    renderSheet({
      viewer: { id: "u-1", name: "Adaeze", email: "adaeze@example.com" },
    });

    // Preset ₦2,500 is selected by default; the total restates the real
    // server-side fee formulas, not a hardcoded markup.
    fireEvent.click(screen.getByRole("button", { name: "Review gift" }));

    expect(screen.getAllByText("Confirm your gift").length).toBeGreaterThan(0);
    expect(screen.getByText("A new study desk")).toBeInTheDocument();
    expect(screen.getByText(naira(2500))).toBeInTheDocument();
    expect(
      screen.getByText(naira(totalFor(2500, "paystack"))),
    ).toBeInTheDocument();
    expect(screen.getByText("Adaeze")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Give ${naira(2500)}` }),
    ).toBeInTheDocument();
  });

  it("sends the wishlist item, giver details and received-callback to the initializer", async () => {
    renderSheet({
      viewer: { id: "u-1", name: "Adaeze", email: "adaeze@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Review gift" }));
    fireEvent.click(screen.getByRole("button", { name: "Give ₦2,500" }));

    const { initializePayment } = usePayment();
    expect(initializePayment).toHaveBeenCalledTimes(1);
    expect(initializePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2500,
        wishlistItemId: "item-9",
        email: "adaeze@example.com",
        isAnonymous: false,
        callbackUrl: expect.stringContaining("/nomso/nomsos-wishlist/received"),
      }),
    );
  });

  it("gates the confirm step on the minimum but passes exactly at it", () => {
    renderSheet({
      viewer: { id: "u-1", name: "Adaeze", email: "adaeze@example.com" },
    });

    // Exactly the ₦100 minimum passes review.
    fireEvent.click(screen.getByRole("button", { name: "Other" }));
    fireEvent.change(screen.getByLabelText("Amount in naira"), {
      target: { value: "100" },
    });
    expect(screen.getByRole("button", { name: "Review gift" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Review gift" }));
    expect(
      screen.getByRole("button", { name: "Give ₦100" }),
    ).toBeInTheDocument();
  });

  it("disables presets above the item's remaining balance", () => {
    // 30000 price − 28000 contributed = ₦2,000 left.
    renderSheet({
      item: { ...item, price: 30_000, contributed: 28_000 },
      viewer: { id: "u-1", name: "Adaeze", email: "adaeze@example.com" },
    });

    expect(screen.getByRole("button", { name: "₦1k" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "₦2.5k" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "₦5k" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "₦10k" })).toBeDisabled();
  });

  it("blocks a gift that would overshoot the goal and states what is left", () => {
    renderSheet({
      item: { ...item, price: 30_000, contributed: 28_000 },
      viewer: { id: "u-1", name: "Adaeze", email: "adaeze@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Other" }));
    fireEvent.change(screen.getByLabelText("Amount in naira"), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review gift" }));

    // The server-owned cap, mirrored in the sheet: no confirm step.
    expect(
      screen.getByText("This item only needs ₦2,000 more."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Give ₦5,000/ }),
    ).not.toBeInTheDocument();
  });

  it("passes exactly at the remaining balance", () => {
    renderSheet({
      item: { ...item, price: 30_000, contributed: 28_000 },
      viewer: { id: "u-1", name: "Adaeze", email: "adaeze@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Other" }));
    fireEvent.change(screen.getByLabelText("Amount in naira"), {
      target: { value: "2000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review gift" }));

    expect(
      screen.getByRole("button", { name: "Give ₦2,000" }),
    ).toBeInTheDocument();
  });

  it("explains when the leftovers are smaller than the minimum", () => {
    renderSheet({
      item: { ...item, price: 80_000, contributed: 79_950 },
      viewer: { id: "u-1", name: "Adaeze", email: "adaeze@example.com" },
    });

    // ₦50 left is smaller than the ₦100 floor: the sheet says so outright…
    expect(screen.getByText(/can't take another gift/)).toBeInTheDocument();
    // …and any gift above ₦50 still hard-stops at review.
    fireEvent.click(screen.getByRole("button", { name: "Review gift" }));
    expect(
      screen.getByText("This item only needs ₦50 more."),
    ).toBeInTheDocument();
  });
});
