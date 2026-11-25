jest.mock("@/lib/wishlist/season", () => ({
  isWishlistSeasonActive: jest.fn(),
}));

import { render, screen } from "@testing-library/react";
import { WishlistLanding } from "@/components/wishlist/wishlist-landing";
import { isWishlistSeasonActive } from "@/lib/wishlist/season";

describe("WishlistLanding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the everyday registry voice outside the season", () => {
    (isWishlistSeasonActive as jest.Mock).mockReturnValue(false);

    render(<WishlistLanding />);

    expect(screen.getByText("The Refreeg wishlist")).toBeInTheDocument();
    expect(
      screen.queryByText(/The Refreeg holiday wishlist/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Show them what would actually make you smile.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/This Christmas/)).not.toBeInTheDocument();
  });

  it("switches to the holiday voice in season", () => {
    (isWishlistSeasonActive as jest.Mock).mockReturnValue(true);

    render(<WishlistLanding />);

    expect(
      screen.getByText("The Refreeg holiday wishlist"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This Christmas, skip the guesswork/),
    ).toBeInTheDocument();
  });

  it("keeps exactly one create CTA and the sample item card visible", () => {
    (isWishlistSeasonActive as jest.Mock).mockReturnValue(false);

    render(<WishlistLanding />);

    const cta = screen.getAllByRole("link", { name: "Create your wishlist" });
    expect(cta).toHaveLength(1);
    expect(cta[0]).toHaveAttribute("href", "/wishlist/new");

    expect(screen.getByText("A new study desk")).toBeInTheDocument();
    expect(screen.getByText("What givers see")).toBeInTheDocument();
    expect(screen.getByText("How it works")).toBeInTheDocument();
  });

  it("walks through the three steps", () => {
    (isWishlistSeasonActive as jest.Mock).mockReturnValue(false);

    render(<WishlistLanding />);

    expect(screen.getByText("Name your gifts")).toBeInTheDocument();
    expect(screen.getByText("Share one link")).toBeInTheDocument();
    expect(screen.getByText("Watch gifts fund")).toBeInTheDocument();
  });
});
