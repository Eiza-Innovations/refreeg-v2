import { render, screen } from "@testing-library/react";
import { DashboardGivingCard } from "@/components/dashboard/dashboard-giving-card";

describe("DashboardGivingCard", () => {
  it("breaks the giving total out into causes and wishlists", () => {
    render(
      <DashboardGivingCard
        givenSoFar={52500}
        causesGiven={50000}
        wishlistsGiven={2500}
        wishlistGifts={1}
        campaignsBacked={2}
        livePledges={0}
      />,
    );

    expect(screen.getByText("₦52,500")).toBeInTheDocument();
    expect(
      screen.getByText("given so far, causes and wishlists"),
    ).toBeInTheDocument();
    expect(screen.getByText("To causes")).toBeInTheDocument();
    expect(screen.getByText("₦50,000")).toBeInTheDocument();
    expect(screen.getByText("To wishlists")).toBeInTheDocument();
    expect(screen.getByText("₦2,500")).toBeInTheDocument();
    expect(screen.getByText("1 gift")).toBeInTheDocument();
  });

  it("pluralises the wishlist gift count", () => {
    render(
      <DashboardGivingCard
        givenSoFar={7500}
        causesGiven={0}
        wishlistsGiven={7500}
        wishlistGifts={3}
        campaignsBacked={0}
        livePledges={0}
      />,
    );

    expect(screen.getByText("3 gifts")).toBeInTheDocument();
  });

  it("hides the split rows when the caller has no breakdown", () => {
    render(
      <DashboardGivingCard
        givenSoFar={50000}
        campaignsBacked={2}
        livePledges={1}
      />,
    );

    expect(screen.getByText("₦50,000")).toBeInTheDocument();
    expect(screen.getByText("given so far")).toBeInTheDocument();
    expect(screen.queryByText("To causes")).not.toBeInTheDocument();
    expect(screen.queryByText("To wishlists")).not.toBeInTheDocument();
  });
});
