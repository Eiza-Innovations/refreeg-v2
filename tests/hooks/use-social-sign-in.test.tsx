import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useSocialSignIn } from "@/hooks/use-social-sign-in";

const signInWithGoogle = jest.fn();
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ signInWithGoogle }),
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

describe("useSocialSignIn", () => {
  beforeEach(() => jest.clearAllMocks());

  it("runs the before-hook, then signs in with Google and the redirect", async () => {
    signInWithGoogle.mockResolvedValue(undefined);
    const before = jest.fn();
    const { result } = renderHook(() => useSocialSignIn("/dashboard", before), {
      wrapper,
    });

    act(() => result.current.google.mutate());

    await waitFor(() =>
      expect(signInWithGoogle).toHaveBeenCalledWith("/dashboard"),
    );
    expect(before).toHaveBeenCalledTimes(1);
  });

  it("shows the real error when Google sign in fails", async () => {
    signInWithGoogle.mockRejectedValue(new Error("Popup closed"));
    const { result } = renderHook(() => useSocialSignIn(null), { wrapper });

    act(() => result.current.google.mutate());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Popup closed" }),
      ),
    );
  });
});
