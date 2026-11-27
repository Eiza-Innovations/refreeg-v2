import { render, screen } from "@testing-library/react";
import { AuthShell } from "@/components/auth/AuthShell";
import { BeatOtpInput } from "@/components/ui/beat-otp-input";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt: string }) => <span>{props.alt}</span>,
}));

beforeAll(() => {
  // jsdom has no ResizeObserver, which the code input uses.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe("auth accessibility", () => {
  it("gives the code input an accessible name", () => {
    render(<BeatOtpInput value="" onChange={jest.fn()} />);

    expect(screen.getByLabelText("6-digit verification code")).toBeTruthy();
  });

  it("only accepts digits in the code input", () => {
    render(<BeatOtpInput value="" onChange={jest.fn()} />);

    const input = screen.getByLabelText("6-digit verification code");
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.getAttribute("autocomplete")).toBe("one-time-code");
  });

  it("does not add a second main landmark, since the app layout already has one", () => {
    const { container } = render(
      <AuthShell brand={{ headline: "Hello", subtitle: "World" }}>
        <p>form</p>
      </AuthShell>,
    );

    expect(container.querySelectorAll("main")).toHaveLength(0);
  });
});
