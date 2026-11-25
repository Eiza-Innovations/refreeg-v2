import { fireEvent, render, screen } from "@testing-library/react";
import {
  WishlistItemCard,
  wishlistItemProgressPercent,
} from "@/components/wishlist/wishlist-item-card";
import type { WishlistItem } from "@/types";

const item = (patch: Partial<WishlistItem> = {}): WishlistItem => ({
  id: "item-1",
  wishlist_id: "w-1",
  name: "A new study desk",
  price: 80_000,
  contributed: 52_400,
  note: "140cm, oak finish",
  sort_order: 0,
  funded_at: null,
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
  ...patch,
});

const baseProps = {
  isOwner: false,
  index: 0,
  itemCount: 1,
  onGive: jest.fn(),
};

describe("wishlistItemProgressPercent", () => {
  it("computes the funded percentage", () => {
    expect(
      wishlistItemProgressPercent({ contributed: 52_400, price: 80_000 }),
    ).toBe(66);
  });

  it("caps at 100 when a race overshoots the price", () => {
    expect(
      wishlistItemProgressPercent({ contributed: 95_000, price: 80_000 }),
    ).toBe(100);
  });

  it("returns 0 for a zero or negative price", () => {
    expect(wishlistItemProgressPercent({ contributed: 5_000, price: 0 })).toBe(
      0,
    );
    expect(wishlistItemProgressPercent({ contributed: 5_000, price: -1 })).toBe(
      0,
    );
  });
});

describe("WishlistItemCard (visitor state)", () => {
  it("renders name, note, price, contributed total and the give button", () => {
    render(<WishlistItemCard item={item()} {...baseProps} />);

    expect(screen.getByText("A new study desk")).toBeInTheDocument();
    expect(screen.getByText("140cm, oak finish")).toBeInTheDocument();
    expect(screen.getByText("₦80,000")).toBeInTheDocument();
    expect(screen.getByText(/₦52,400 contributed/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Give to this gift" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/₦27,600 to go/)).toBeInTheDocument();
  });

  it("retires the give button and shows the funded badge once funded_at is set", () => {
    render(
      <WishlistItemCard
        item={item({ contributed: 85_000, funded_at: "2026-11-20T10:00:00Z" })}
        {...baseProps}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Give to this gift" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("FULLY FUNDED")).toBeInTheDocument();
    expect(screen.queryByText(/to go/)).not.toBeInTheDocument();
  });

  it("pauses giving with a notice when the wishlist is archived", () => {
    render(<WishlistItemCard item={item()} {...baseProps} archived />);

    expect(
      screen.queryByRole("button", { name: "Give to this gift" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/giving is paused/i)).toBeInTheDocument();
  });
});

describe("WishlistItemCard (owner state)", () => {
  it("shows reorder, edit and remove controls only for the owner", () => {
    const onEdit = jest.fn();
    render(
      <WishlistItemCard item={item()} {...baseProps} isOwner onEdit={onEdit} />,
    );

    expect(
      screen.getByRole("button", { name: "Edit A new study desk" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove A new study desk" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Move A new study desk up/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Move A new study desk down/ }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Edit A new study desk" }),
    );
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("enables the move-down control when there is a next item", () => {
    render(
      <WishlistItemCard
        item={item()}
        {...baseProps}
        isOwner
        index={0}
        itemCount={2}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Move A new study desk down/ }),
    ).toBeEnabled();
  });
});
