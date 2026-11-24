jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/donations",
  useSearchParams: () => new URLSearchParams("filter=delivered&q=food"),
}));

import { act, fireEvent, render, screen } from "@testing-library/react";
import { GivingSearch } from "@/components/giving/giving-search";

describe("GivingSearch (in-place commit)", () => {
  const originalFetch = window.fetch;
  let replaceState: jest.SpyInstance;
  let events: CustomEvent[];
  const onSearch = (e: Event) => events.push(e as CustomEvent);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    events = [];
    window.addEventListener("giving:search", onSearch);
    replaceState = jest.spyOn(window.history, "replaceState");
  });

  afterEach(() => {
    jest.useRealTimers();
    window.removeEventListener("giving:search", onSearch);
    global.fetch = originalFetch;
  });

  const input = () => screen.getByLabelText(/search your giving/i);

  const type = async (value: string) => {
    fireEvent.change(input(), { target: { value } });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
  };

  it("broadcasts the debounced query and syncs the URL without navigating", async () => {
    render(<GivingSearch />);

    await type("school");

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ q: "school" });
    // Existing params (filter=delivered) survive; no router.replace.
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/dashboard/donations?filter=delivered&q=school",
    );
  });

  it("drops the q param when the query is cleared", async () => {
    render(<GivingSearch />);

    await type("school");
    await type("");

    expect(events[1].detail).toEqual({ q: "" });
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/dashboard/donations?filter=delivered",
    );
  });

  it("commits immediately on Enter instead of waiting for the debounce", () => {
    render(<GivingSearch />);

    fireEvent.change(input(), { target: { value: "quick" } });
    fireEvent.keyDown(input(), { key: "Enter" });

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ q: "quick" });
  });

  it("prefills from the URL and never re-commits the initial value", async () => {
    // useSearchParams is mocked with q=food — the input starts filled.
    render(<GivingSearch />);

    const box = input() as HTMLInputElement;
    expect(box.value).toBe("food");

    // Blur/refocus or a no-op render must not push anything.
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(events).toHaveLength(0);
    expect(replaceState).not.toHaveBeenCalled();
  });
});
