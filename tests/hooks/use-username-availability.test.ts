import { act, renderHook, waitFor } from "@testing-library/react";
import { checkUsernameAvailability } from "@/actions/users/profile-actions";
import { useUsernameAvailability } from "@/hooks/use-username-availability";

jest.mock("@/actions/users/profile-actions", () => ({
  checkUsernameAvailability: jest.fn(),
}));

const check = checkUsernameAvailability as jest.Mock;

describe("useUsernameAvailability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it("does nothing for handles shorter than three characters", () => {
    const { result } = renderHook(() => useUsernameAvailability("ab", "u1"));

    act(() => jest.advanceTimersByTime(1000));

    expect(result.current).toBe("idle");
    expect(check).not.toHaveBeenCalled();
  });

  it("never calls the server for a handle with characters that cannot be saved", () => {
    const { result } = renderHook(() =>
      useUsernameAvailability("Bad Name!", "u1"),
    );

    act(() => jest.advanceTimersByTime(1000));

    expect(result.current).toBe("idle");
    expect(check).not.toHaveBeenCalled();
  });

  it("checks after a pause and reports an available handle", async () => {
    check.mockResolvedValue(true);
    const { result } = renderHook(() =>
      useUsernameAvailability("ada_obi", "u1"),
    );

    expect(result.current).toBe("checking");
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => expect(result.current).toBe("available"));
    expect(check).toHaveBeenCalledWith("ada_obi", "u1");
  });

  it("reports a taken handle", async () => {
    check.mockResolvedValue(false);
    const { result } = renderHook(() => useUsernameAvailability("ada_obi"));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => expect(result.current).toBe("taken"));
  });

  it("falls back to idle when the check fails", async () => {
    check.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useUsernameAvailability("ada_obi"));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => expect(result.current).toBe("idle"));
  });
});
