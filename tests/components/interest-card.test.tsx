import { fireEvent, render, screen } from "@testing-library/react";
import { InterestCard } from "@/components/onboarding/InterestCard";

const base = {
  label: "Community",
  count: 4,
  countsLoaded: true,
  selected: false,
  onToggle: jest.fn(),
};

describe("InterestCard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the campaign count in the plural", () => {
    render(<InterestCard {...base} />);
    expect(screen.getByText("4 campaigns")).toBeTruthy();
  });

  it("says '1 campaign' in the singular and '0 campaigns' for none", () => {
    const { rerender } = render(<InterestCard {...base} count={1} />);
    expect(screen.getByText("1 campaign")).toBeTruthy();

    rerender(<InterestCard {...base} count={0} />);
    expect(screen.getByText("0 campaigns")).toBeTruthy();
  });

  it("shows nothing for the count when it is unknown, and a placeholder while loading", () => {
    const { rerender, container } = render(
      <InterestCard {...base} count={null} />,
    );
    expect(screen.queryByText(/campaign/)).toBeNull();

    rerender(<InterestCard {...base} count={null} countsLoaded={false} />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("reports whether it is selected and toggles when pressed", () => {
    const { rerender } = render(<InterestCard {...base} />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(button);
    expect(base.onToggle).toHaveBeenCalledTimes(1);

    rerender(<InterestCard {...base} selected />);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe(
      "true",
    );
  });
});
