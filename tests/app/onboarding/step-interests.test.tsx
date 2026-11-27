import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StepInterests from "@/app/onboarding/step-interests";
import { getInterestOptions } from "@/actions/users/interest-actions";
import {
  interestOptions,
  MIN_INTERESTS_REQUIRED,
} from "@/lib/causes/interest-categories";
import { campaignCategoryStyles } from "@/lib/causes/campaign-categories";

jest.mock("@/actions/users/interest-actions", () => ({
  getInterestOptions: jest.fn(),
  saveUserInterests: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

const props = {
  user: { id: "u1" },
  onNext: jest.fn(),
  onboardingData: { interests: [] },
  updateOnboardingData: jest.fn(),
} as unknown as React.ComponentProps<typeof StepInterests>;

function renderStep() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <StepInterests {...props} />
    </QueryClientProvider>,
  );
}

describe("StepInterests counts", () => {
  it("does not say 'Coming soon' while the campaign counts are still loading", async () => {
    let resolve!: (value: unknown) => void;
    (getInterestOptions as jest.Mock).mockReturnValue(
      new Promise((r) => (resolve = r)),
    );

    renderStep();

    expect(screen.queryByText("Coming soon")).toBeNull();

    resolve([
      { id: "education", label: "Education", count: 4 },
      { id: "health", label: "Health", count: 0 },
    ]);

    await waitFor(() => expect(screen.getByText("4 campaigns")).toBeTruthy());
    expect(screen.getByText("0 campaigns")).toBeTruthy();
  });

  it("offers exactly the campaign categories, under their campaign names", async () => {
    (getInterestOptions as jest.Mock).mockResolvedValue(
      interestOptions.map((option) => ({
        id: option.id,
        label: option.label,
        count: 0,
      })),
    );

    renderStep();

    await waitFor(() =>
      expect(screen.getAllByText("0 campaigns")).toHaveLength(
        campaignCategoryStyles.length,
      ),
    );
    for (const category of campaignCategoryStyles) {
      expect(screen.getByText(category.name)).toBeTruthy();
    }
    // The old placeholders with no campaigns behind them are gone.
    for (const name of ["Water", "Women & girls", "Accountability"]) {
      expect(screen.queryByText(name)).toBeNull();
    }
    expect(screen.queryByText("Coming soon")).toBeNull();
  });

  it("says '1 campaign' in the singular", async () => {
    (getInterestOptions as jest.Mock).mockResolvedValue([
      { id: "health", label: "Healthcare", count: 1 },
    ]);

    renderStep();

    await waitFor(() => expect(screen.getByText("1 campaign")).toBeTruthy());
  });

  it("shows the real error when the campaign counts cannot be loaded, and keeps the choices", async () => {
    (getInterestOptions as jest.Mock).mockRejectedValue(
      new Error("Could not load campaign counts"),
    );

    renderStep();

    await waitFor(() =>
      expect(screen.getByText("Could not load campaign counts")).toBeTruthy(),
    );
    expect(screen.getByText("Education")).toBeTruthy();
  });

  it("still offers enough categories to reach the minimum of three", () => {
    expect(interestOptions.length).toBeGreaterThanOrEqual(
      MIN_INTERESTS_REQUIRED,
    );
  });

  it("falls back to the plain labels when the counts fail to load", async () => {
    (getInterestOptions as jest.Mock).mockRejectedValue(new Error("offline"));

    renderStep();

    await waitFor(() => expect(screen.queryByTestId("never")).toBeNull());
    expect(screen.getByText("Education")).toBeTruthy();
    expect(screen.queryByText("Water")).toBeNull();
  });

  it("exposes which interests are selected", async () => {
    (getInterestOptions as jest.Mock).mockResolvedValue([
      { id: "education", label: "Education", count: 2 },
    ]);
    renderStep();

    await waitFor(() => expect(screen.getByText("2 campaigns")).toBeTruthy());
    expect(
      screen.getAllByRole("button").some((b) => b.hasAttribute("aria-pressed")),
    ).toBe(true);
  });
});
