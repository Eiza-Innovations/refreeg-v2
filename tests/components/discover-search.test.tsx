import { fireEvent, render, screen } from "@testing-library/react";
import { DiscoverSearch } from "@/components/discover/discover-search";
import { useDiscoverSearch } from "@/hooks/use-discover-search";
import type { DiscoverItem } from "@/types/discover-types";

// The hook is the boundary under test: the combobox UI must drive it and
// render whatever it returns, regardless of how searchDiscover fetches.
jest.mock("@/hooks/use-discover-search", () => ({
  useDiscoverSearch: jest.fn(),
}));

const mockSearch = {
  query: "",
  setQuery: jest.fn(),
  loading: false,
  results: null as {
    campaigns: DiscoverItem[];
    petitions: DiscoverItem[];
    organizations: {
      id: string;
      name: string;
      logoUrl: string | null;
      username: string | null;
      isVerified: boolean;
    }[];
    totalCount: number;
  } | null,
  goToFullResults: jest.fn(),
  selectCause: jest.fn(),
  selectPetition: jest.fn(),
  selectOrg: jest.fn(),
};

function setup(overrides: Partial<typeof mockSearch> = {}) {
  (useDiscoverSearch as jest.Mock).mockReturnValue({
    ...mockSearch,
    ...overrides,
  });
  return render(<DiscoverSearch />);
}

const campaign = {
  id: "cause-1",
  title: "Hope Water Drive",
  image: null,
  orgName: "Hope Initiative",
  percent: 42,
  urgent: false,
} as unknown as DiscoverItem;

const petition = {
  id: "petition-1",
  title: "Cleaner Lagos",
  raised: 1200,
  goal: 5000,
} as unknown as DiscoverItem;

beforeEach(() => {
  jest.clearAllMocks();
  // cmdk observes item sizing via ResizeObserver, which jsdom lacks.
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  // @ts-expect-error - restoring the jsdom default (undefined)
  delete global.ResizeObserver;
});

describe("DiscoverSearch (inline combobox)", () => {
  it("renders a real input in the header — no dialog, no duplicate input", () => {
    setup();

    const input = screen.getByPlaceholderText(
      /Search campaigns, petitions, organisations/i,
    );
    expect(input).toBeInTheDocument();
    expect(document.querySelector("[role='dialog']")).toBeNull();
  });

  it("shows no dropdown on focus with an empty query", () => {
    // The placeholder already says what to do; focus alone must not pop
    // an empty panel (no recent searches, no popular, no empty-state copy).
    setup();

    fireEvent.focus(screen.getByRole("combobox"));

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByText("Recent searches")).toBeNull();
    expect(screen.queryByText(/Start typing/i)).toBeNull();
  });

  it("drives the hook on typing and shows a loading state while it works", () => {
    setup({ query: "water", loading: true });

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "lagos" } });

    expect(mockSearch.setQuery).toHaveBeenCalledWith("lagos");
    expect(screen.getByText(/Searching/i)).toBeInTheDocument();
  });

  it("renders grouped results and selects a cause on click", () => {
    // Query deliberately avoids matching the titles so the highlighter
    // leaves the text intact and the full strings remain queryable.
    setup({
      query: "donate",
      results: {
        campaigns: [campaign],
        petitions: [petition],
        organizations: [],
        totalCount: 2,
      },
    });

    fireEvent.focus(screen.getByRole("combobox"));

    expect(screen.getByText("Campaigns")).toBeInTheDocument();
    expect(screen.getByText("Petitions")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Hope Water Drive"));
    expect(mockSearch.selectCause).toHaveBeenCalledWith("cause-1");
  });

  it("closes the panel on Escape without clearing the input", () => {
    setup({
      query: "water",
      results: {
        campaigns: [campaign],
        petitions: [],
        organizations: [],
        totalCount: 1,
      },
    });

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(screen.getByText("Campaigns")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByText("Campaigns")).toBeNull();
    expect(input).toBeInTheDocument();
    expect(mockSearch.setQuery).not.toHaveBeenCalled();
  });

  it("closes when a pointer press lands outside the combobox", () => {
    setup({
      query: "water",
      results: {
        campaigns: [campaign],
        petitions: [],
        organizations: [],
        totalCount: 1,
      },
    });

    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.getByText("Campaigns")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByText("Campaigns")).toBeNull();
  });

  it("offers a clear button once a query is set, and clears it", () => {
    setup({ query: "water" });

    const clear = screen.getByRole("button", { name: /clear search/i });
    // mousedown is prevented so focus stays in the input while clearing
    fireEvent.mouseDown(clear);

    expect(mockSearch.setQuery).toHaveBeenCalledWith("");
  });
});
