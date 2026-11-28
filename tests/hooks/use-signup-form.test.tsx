import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useSignupForm } from "@/hooks/use-signup-form";
import type { SignupCopy } from "@/types/auth-types";

const push = jest.fn();
const prefetch = jest.fn();
jest.mock("nextjs-toploader/app", () => ({
  useRouter: () => ({ push, prefetch }),
}));
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: null, signInWithGoogle: jest.fn() }),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

const copy: SignupCopy = {
  accountType: "individual",
  prefetchPath: "/auth/signup/organization",
  creating: { title: "Creating", description: "Setting up" },
  codeSentDescription: "Code sent",
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    }
  >
    {children}
  </QueryClientProvider>
);

function fill(result: { current: ReturnType<typeof useSignupForm> }) {
  act(() => result.current.setFormFields("email", "Jane@Example.com"));
  act(() => result.current.setFormFields("password", "Passw0rd!long"));
  act(() => result.current.setFormFields("confirmPassword", "Passw0rd!long"));
  act(() => result.current.setFormFields("agreeTerms", true));
}

const submit = (result: { current: ReturnType<typeof useSignupForm> }) =>
  act(() =>
    result.current.handleSubmit({
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent),
  );

describe("useSignupForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("fills the email from the link behind 'Change email'", async () => {
    window.history.pushState({}, "", "/auth/signup?email=ada%40example.com");
    const { result } = renderHook(() => useSignupForm(copy), { wrapper });

    await waitFor(() =>
      expect(result.current.form.email).toBe("ada@example.com"),
    );

    window.history.pushState({}, "", "/");
  });

  it("blocks an invalid form and shows field errors", () => {
    const { result } = renderHook(() => useSignupForm(copy), { wrapper });

    submit(result);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.errors.email).toBeTruthy();
  });

  it("requires the terms to be accepted", () => {
    const { result } = renderHook(() => useSignupForm(copy), { wrapper });

    fill(result);
    act(() => result.current.setFormFields("agreeTerms", false));
    submit(result);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.termsError).toBe(
      "Accept the terms and privacy policy to continue.",
    );

    // Ticking the box again clears it.
    act(() => result.current.setFormFields("agreeTerms", true));
    expect(result.current.termsError).toBeUndefined();
  });

  it("registers and continues to the code page", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      statusText: "OK",
      json: async () => ({}),
    });
    const { result } = renderHook(() => useSignupForm(copy), { wrapper });
    fill(result);

    submit(result);

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/auth/verify-otp?email=jane%40example.com",
      ),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/register-pending",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("exposes the server's error for inline display when registration fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: "Conflict",
      json: async () => ({ error: "Email already registered" }),
    });
    const { result } = renderHook(() => useSignupForm(copy), { wrapper });
    fill(result);

    submit(result);

    await waitFor(() =>
      expect(result.current.submitError).toBe("Email already registered"),
    );
    expect(push).not.toHaveBeenCalled();

    // Editing a field clears the stale error.
    act(() => result.current.setFormFields("email", "other@example.com"));
    expect(result.current.submitError).toBeNull();
  });
});
