import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { formatCountdown, useVerifyOtp } from "@/hooks/use-verify-otp";

const push = jest.fn();
jest.mock("nextjs-toploader/app", () => ({ useRouter: () => ({ push }) }));
jest.mock("next-auth/react", () => ({ signIn: jest.fn() }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    }
  >
    {children}
  </QueryClientProvider>
);

function respond(ok: boolean, body: object) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    statusText: "Error",
    json: async () => body,
  });
}

describe("useVerifyOtp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("shows the server's message when the code is wrong", async () => {
    respond(false, { error: "That code doesn't match." });
    const { result } = renderHook(
      () => useVerifyOtp({ email: "a@b.co", redirect: null }),
      { wrapper },
    );

    act(() => result.current.changeCode("K4T9PQ"));
    act(() => result.current.submitCode("K4T9PQ"));

    await waitFor(() =>
      expect(result.current.error).toBe("That code doesn't match."),
    );
    // Shown inline, not as a toast, and the rejected code is cleared for a retry.
    expect(toast.error).not.toHaveBeenCalled();
    expect(result.current.otpCode).toBe("");

    // Typing the next code clears the message.
    act(() => result.current.changeCode("K"));
    expect(result.current.error).toBeNull();
  });

  it("asks for a fresh start once the sign-up is locked or gone", async () => {
    respond(false, {
      error: "Too many failed attempts. Please sign up again.",
    });
    const { result } = renderHook(
      () => useVerifyOtp({ email: "a@b.co", redirect: null }),
      { wrapper },
    );
    expect(result.current.restartRequired).toBe(false);

    act(() => result.current.submitCode("123456"));

    await waitFor(() => expect(result.current.restartRequired).toBe(true));
  });

  it("keeps Resend available after an ordinary wrong code", async () => {
    respond(false, { error: "Invalid verification code." });
    const { result } = renderHook(
      () => useVerifyOtp({ email: "a@b.co", redirect: null }),
      { wrapper },
    );

    act(() => result.current.submitCode("123456"));

    await waitFor(() =>
      expect(result.current.error).toBe("Invalid verification code."),
    );
    expect(result.current.restartRequired).toBe(false);
  });

  it("shows a failed resend inline instead of as a toast", async () => {
    jest.useFakeTimers();
    respond(false, {
      error: "No pending registration found. Please sign up again.",
    });
    const { result } = renderHook(
      () => useVerifyOtp({ email: "a@b.co", redirect: null }),
      { wrapper },
    );
    for (let second = 0; second < 60; second++) {
      act(() => jest.advanceTimersByTime(1000));
    }
    jest.useRealTimers();

    act(() => result.current.resendCode());

    await waitFor(() => expect(result.current.restartRequired).toBe(true));
    expect(result.current.error).toMatch(/sign up again/);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("signs in and continues to onboarding with the redirect", async () => {
    respond(true, { loginToken: "tok" });
    (signIn as jest.Mock).mockResolvedValue({});
    const { result } = renderHook(
      () => useVerifyOtp({ email: "a@b.co", redirect: "/dashboard/causes" }),
      { wrapper },
    );

    act(() => result.current.submitCode("K4T9PQ"));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/onboarding?redirect=%2Fdashboard%2Fcauses",
      ),
    );
    expect(signIn).toHaveBeenCalledWith(
      "otp-login",
      expect.objectContaining({ email: "a@b.co", token: "tok" }),
    );
  });

  it("ignores codes that are not six characters", () => {
    const { result } = renderHook(
      () => useVerifyOtp({ email: "a@b.co", redirect: null }),
      { wrapper },
    );

    act(() => result.current.submitCode("K4T"));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("formats the resend countdown", () => {
    expect(formatCountdown(60)).toBe("1:00");
    expect(formatCountdown(24)).toBe("0:24");
  });
});
