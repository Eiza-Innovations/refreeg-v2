import { render, screen } from "@testing-library/react";
import Step5 from "@/app/onboarding/step5";

let redirect: string | null = null;
jest.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(redirect ? `redirect=${redirect}` : ""),
  useRouter: () => ({ push: jest.fn() }),
}));

const props = {
  user: { id: "u1", name: "Ada" },
  onComplete: jest.fn(),
  onboardingData: {
    accountType: "individual",
    profile: { firstName: "Ada" },
  },
} as unknown as React.ComponentProps<typeof Step5>;

describe("Step5 primary button", () => {
  it("says Go to dashboard when there is nowhere else to return to", () => {
    redirect = null;
    render(<Step5 {...props} />);
    expect(
      screen.getByRole("button", { name: /Go to dashboard/ }),
    ).toBeTruthy();
  });

  it("says Continue when it will return the person to the page they came from", () => {
    redirect = "/petitions";
    render(<Step5 {...props} />);
    expect(screen.getByRole("button", { name: /^Continue/ })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Go to dashboard/ }),
    ).toBeNull();
  });

  it("ignores an unsafe redirect", () => {
    redirect = "https://evil.example";
    render(<Step5 {...props} />);
    expect(
      screen.getByRole("button", { name: /Go to dashboard/ }),
    ).toBeTruthy();
  });
});
