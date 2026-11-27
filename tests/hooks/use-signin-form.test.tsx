import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSigninForm } from "@/hooks/use-signin-form";

const signIn = jest.fn().mockResolvedValue(undefined);
const signInWithGoogle = jest.fn().mockResolvedValue(undefined);
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: null, isLoading: false, signIn, signInWithGoogle }),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    }
  >
    {children}
  </QueryClientProvider>
);

const submit = (result: { current: ReturnType<typeof useSigninForm> }) =>
  act(() =>
    result.current.handleSubmit({
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent),
  );

describe("useSigninForm", () => {
  beforeEach(() => jest.clearAllMocks());

  it("blocks an empty submit and shows field errors", () => {
    const { result } = renderHook(() => useSigninForm(null), { wrapper });

    submit(result);

    expect(signIn).not.toHaveBeenCalled();
    expect(result.current.errors.email).toBe("Email address is required");
    expect(result.current.errors.password).toBe("Password is required");
  });

  it("rejects an invalid email", () => {
    const { result } = renderHook(() => useSigninForm(null), { wrapper });
    act(() => result.current.setFormFields("email", "nope"));
    act(() => result.current.setFormFields("password", "secret"));

    submit(result);

    expect(signIn).not.toHaveBeenCalled();
    expect(result.current.errors.email).toBe("Enter a valid email address");
  });

  it("signs in with a trimmed, lower-cased email and the redirect", async () => {
    const { result } = renderHook(() => useSigninForm("/dashboard"), {
      wrapper,
    });
    act(() => result.current.setFormFields("email", " Jane@Example.COM "));
    act(() => result.current.setFormFields("password", "secret"));

    submit(result);

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith(
        "jane@example.com",
        "secret",
        "/dashboard",
      ),
    );
  });

  it("clears a field's error when it is edited", () => {
    const { result } = renderHook(() => useSigninForm(null), { wrapper });
    submit(result);

    act(() => result.current.setFormFields("email", "a"));

    expect(result.current.errors.email).toBeUndefined();
  });
});
