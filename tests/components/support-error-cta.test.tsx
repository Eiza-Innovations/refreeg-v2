import { fireEvent, render, screen } from "@testing-library/react";
import { SupportErrorCta } from "@/components/engagement/SupportErrorCta";

describe("SupportErrorCta", () => {
  it("shows the title, the support links and the retry action", () => {
    const onRetry = jest.fn();
    render(
      <SupportErrorCta
        title="This page could not be found"
        onRetry={onRetry}
        retryLabel="Go home"
      />,
    );

    expect(
      screen.getByText("This page could not be found"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Follow us on X/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Join Telegram/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go home" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the real error message when there is one", () => {
    render(<SupportErrorCta errorMessage="Connection timed out" />);

    expect(screen.getByText("Connection timed out")).toBeInTheDocument();
  });

  it("hides the retry button without a handler", () => {
    render(<SupportErrorCta />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});
