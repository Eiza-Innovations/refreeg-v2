jest.mock("@/actions/wishlists/wishlist-actions", () => ({
  reorderWishlistItems: jest.fn(),
  deleteWishlistItem: jest.fn(),
  setWishlistStatus: jest.fn(),
  updateWishlist: jest.fn(),
}));

jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

jest.mock("@/components/wishlist/contribute-sheet", () => ({
  ContributeSheet: () => null,
}));

jest.mock("@/components/wishlist/item-editor-sheet", () => ({
  ItemEditorSheet: () => null,
}));

jest.mock("@/components/wishlist/share-link-row", () => ({
  ShareLinkRow: () => null,
}));

import { render, screen } from "@testing-library/react";
import { WishlistView } from "@/components/wishlist/wishlist-view";
import type { WishlistItem, WishlistWithItems } from "@/types";

const wishlist: WishlistWithItems = {
  id: "w-1",
  user_id: "u-owner",
  title: "Nomso's Wishlist",
  slug: "nomsos-wishlist",
  message: null,
  status: "active",
  is_public: false,
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
  items: [],
};

const collecting: WishlistItem = {
  id: "i-1",
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

const funded: WishlistItem = {
  id: "i-2",
  wishlist_id: "w-1",
  name: "Noise-cancelling headphones",
  price: 40_000,
  contributed: 40_000,
  note: null,
  sort_order: 1,
  funded_at: "2026-11-20T09:00:00Z",
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-20T09:00:00Z",
};

const viewer = { id: "u-owner", name: "Nomso", email: "nomso@example.com" };

const renderView = (
  overrides: Partial<Parameters<typeof WishlistView>[0]> = {},
) =>
  render(
    <WishlistView
      wishlist={wishlist}
      ownerUsername="nomso"
      viewerIsOwner={false}
      viewer={null}
      seasonal={false}
      {...overrides}
    />,
  );

describe("WishlistView states", () => {
  it("shows the owner an empty-list call to action with the page outline intact", () => {
    renderView({ viewerIsOwner: true, viewer });

    // The wishlist title stays the page's single h1; the empty state is a
    // section heading, not a second document title.
    expect(
      screen.getByRole("heading", { name: "Nomso's Wishlist", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "No gifts listed yet", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add your first item" }),
    ).toBeInTheDocument();
  });

  it("tells visitors to check back when nothing is listed yet", () => {
    renderView();

    expect(
      screen.getByText(
        "Check back soon; the wishlist owner is still picking gifts.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add your first item" }),
    ).not.toBeInTheDocument();
  });

  it("switches the eyebrow with the season", () => {
    const { unmount } = renderView();
    expect(screen.getByText("A Refreeg wishlist")).toBeInTheDocument();
    unmount();

    renderView({ seasonal: true });
    expect(
      screen.getByText("The Refreeg holiday wishlist"),
    ).toBeInTheDocument();
  });

  it("pauses giving on an archived wishlist without breaking the link", () => {
    renderView({
      wishlist: {
        ...wishlist,
        status: "archived",
        items: [collecting, funded],
      },
      viewerIsOwner: true,
      viewer,
    });

    expect(
      screen.getByText(
        "Everything stays visible, but giving is paused until the owner unarchives it.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Give to this gift" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("This wishlist is archived, so giving is paused."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Funded before this wishlist was archived."),
    ).toBeInTheDocument();

    // The owner can still manage the list: unarchive is offered, adding is
    // not (new items would be invisible to the paused link's purpose).
    expect(
      screen.queryByRole("button", { name: /Add an item/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add your first item" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unarchive/ })).toBeEnabled();
  });
});
