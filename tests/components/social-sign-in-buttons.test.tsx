import { fireEvent, render, screen } from "@testing-library/react";
import { SocialSignInButtons } from "@/components/auth/SocialSignInButtons";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt: string }) => <span>{props.alt}</span>,
}));

describe("SocialSignInButtons", () => {
  it("offers only the providers that work today", () => {
    render(
      <SocialSignInButtons
        disabled={false}
        googleLoading={false}
        onGoogle={jest.fn()}
      />,
    );

    expect(screen.getByText("Continue with Google")).toBeTruthy();
    // Apple sign-in is not available yet, so it must not be offered.
    expect(screen.queryByText(/apple/i)).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("calls onGoogle and respects disabled", () => {
    const onGoogle = jest.fn();
    const { rerender } = render(
      <SocialSignInButtons
        disabled={false}
        googleLoading={false}
        onGoogle={onGoogle}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onGoogle).toHaveBeenCalledTimes(1);

    rerender(
      <SocialSignInButtons
        disabled
        googleLoading={false}
        onGoogle={onGoogle}
      />,
    );
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
