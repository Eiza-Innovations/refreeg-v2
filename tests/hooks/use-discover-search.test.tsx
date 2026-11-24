import { act, renderHook } from "@testing-library/react";
import { useDiscoverSearch } from "@/hooks/use-discover-search";

jest.mock("nextjs-toploader/app", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const searchResponse = (overrides: Record<string, unknown> = {}) => ({
  campaigns: [],
  petitions: [],
  organizations: [],
  totalCount: 0,
  ...overrides,
});

const jsonResponse = (body: unknown, ok = true) => ({
  ok,
  json: async () => body,
});

describe("useDiscoverSearch (GET /api/search)", () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  const flush = () => act(async () => {});

  const typeQuery = async (
    result: { current: { setQuery: (v: string) => void } },
    q: string,
  ) => {
    act(() => result.current.setQuery(q));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await flush();
  };

  it("fetches the debounced query from the GET route", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(searchResponse({ totalCount: 3 })),
    );

    const { result } = renderHook(() => useDiscoverSearch());

    await typeQuery(result, "water");

    expect(fetchMock).toHaveBeenCalledWith("/api/search?q=water", {
      signal: expect.any(AbortSignal),
    });
    expect(result.current.results?.totalCount).toBe(3);
    expect(result.current.loading).toBe(false);
  });

  it("aborts the in-flight request when the query changes", async () => {
    fetchMock.mockImplementation(
      (_url: string, init?: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );

    const { result } = renderHook(() => useDiscoverSearch());

    await typeQuery(result, "wa");
    const searchCalls = () =>
      fetchMock.mock.calls.filter(([url]) => String(url).includes("?q="));
    const firstSignal = searchCalls()[0][1].signal as AbortSignal;

    await typeQuery(result, "water");
    expect(searchCalls()).toHaveLength(2);
    expect(firstSignal.aborted).toBe(true);
    // The aborted request never overwrote the results.
    expect(result.current.results).toBeNull();
  });

  it("ignores AbortError but degrades real failures to empty results", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useDiscoverSearch());

    await typeQuery(result, "water");

    expect(result.current.results).toEqual({
      campaigns: [],
      petitions: [],
      organizations: [],
      totalCount: 0,
    });
    expect(result.current.loading).toBe(false);
  });

  it("clears results and loading when the query is emptied", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(searchResponse({ totalCount: 2 })),
    );

    const { result } = renderHook(() => useDiscoverSearch());

    await typeQuery(result, "water");
    expect(result.current.results?.totalCount).toBe(2);

    await typeQuery(result, "");
    expect(result.current.results).toBeNull();
    expect(result.current.loading).toBe(false);
    // Clearing must not fire another request.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
