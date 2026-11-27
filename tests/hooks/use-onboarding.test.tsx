import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  completeOnboarding,
  getOnboardingProgress,
  saveStep2Progress,
} from "@/actions/users/profile-actions";
import { useOnboarding } from "@/hooks/use-onboarding";
import { hardNavigate } from "@/lib/hard-navigate";

const push = jest.fn();
const update = jest.fn();
// jest maps both next/navigation and nextjs-toploader/app to one mock file.
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams("redirect=%2Fdashboard%2Fcauses"),
}));
const mockSession: { current: object } = {
  current: {
    status: "authenticated",
    update,
    data: {
      user: {
        id: "u1",
        name: "Ada Obi",
        email: "ada@example.com",
        image: null,
      },
    },
  },
};
jest.mock("next-auth/react", () => ({
  useSession: () => mockSession.current,
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));
jest.mock("@/lib/hard-navigate", () => ({ hardNavigate: jest.fn() }));
jest.mock("@/actions/users/profile-actions", () => ({
  getOnboardingProgress: jest.fn().mockResolvedValue({
    completed: false,
    step: 2,
    data: {
      accountType: "individual",
      organizationPurpose: "",
      gender: "",
      profile: {
        firstName: "",
        lastName: "",
        username: "",
        bio: "",
        location: "",
        phone: "",
      },
    },
  }),
  saveStep1Progress: jest.fn().mockResolvedValue(undefined),
  saveStep2Progress: jest.fn().mockResolvedValue(undefined),
  createOnboardingProfile: jest.fn().mockResolvedValue({}),
  completeOnboarding: jest.fn().mockResolvedValue(undefined),
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

describe("useOnboarding", () => {
  const signedIn = {
    status: "authenticated",
    update,
    data: {
      user: {
        id: "u1",
        name: "Ada Obi",
        email: "ada@example.com",
        image: null,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockSession.current = signedIn;
  });

  it("sends signed-out visitors to sign in", async () => {
    mockSession.current = { status: "unauthenticated", update, data: null };
    renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => expect(push).toHaveBeenCalledWith("/auth/signin"));
  });

  it("sends people who already finished onboarding to the dashboard", async () => {
    (getOnboardingProgress as jest.Mock).mockResolvedValueOnce({
      completed: true,
    });
    renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("does not fall back to step 1 when progress cannot be loaded, and can retry", async () => {
    localStorage.setItem("onboarding_step1_confirmed", "1");
    (getOnboardingProgress as jest.Mock).mockRejectedValueOnce(
      new Error("Server has closed the connection"),
    );
    const { result } = renderHook(() => useOnboarding(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
              },
            })
          }
        >
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() =>
      expect(result.current.loadError).toBe("Server has closed the connection"),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.currentStepId).toBe("account-type");

    await act(async () => {
      await result.current.retryLoad();
    });

    await waitFor(() => expect(result.current.currentStepId).toBe("gender"));
    expect(result.current.loadError).toBeNull();
  });

  it("opens a newly registered individual on step 1 with their sign-up choice preselected", async () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.currentStepId).toBe("account-type");
    expect(result.current.onboardingData.accountType).toBe("individual");
  });

  it("remembers that step 1 was confirmed, so a refresh resumes on gender", async () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.handleStep1Next("individual");
    });
    await waitFor(() => expect(result.current.currentStepId).toBe("gender"));
    expect(localStorage.getItem("onboarding_step1_confirmed")).toBe("1");

    const refreshed = renderHook(() => useOnboarding(), { wrapper });
    await waitFor(() => expect(refreshed.result.current.isLoading).toBe(false));
    expect(refreshed.result.current.currentStepId).toBe("gender");
  });

  it("resumes on the saved step and splits the name for the profile", async () => {
    localStorage.setItem("onboarding_step1_confirmed", "1");
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.currentStepId).toBe("gender");
    expect(result.current.onboardingData.profile.firstName).toBe("Ada");
    expect(result.current.onboardingData.profile.lastName).toBe("Obi");
  });

  it("saves the gender, then moves to the profile step", async () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.handleStep2Next("female");
    });

    await waitFor(() => expect(result.current.currentStepId).toBe("profile"));
    expect(saveStep2Progress).toHaveBeenCalledWith("u1", "female");
    expect(result.current.onboardingData.gender).toBe("female");
  });

  it("completes onboarding and goes to the requested redirect", async () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.handleComplete();
    });

    await waitFor(() =>
      expect(hardNavigate).toHaveBeenCalledWith("/dashboard/causes"),
    );
    expect(completeOnboarding).toHaveBeenCalledWith("u1");
    expect(update).toHaveBeenCalledWith({ onboardingCompleted: true });
  });
});
