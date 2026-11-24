jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...props} alt="" />,
}));

jest.mock("@/actions/donations/giving-actions", () => ({
  getGivingOverview: jest.fn(),
}));

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { getGivingOverview } from "@/actions/donations/giving-actions";
import { GiftsPanel } from "@/components/giving/gifts-panel";
import type { GiftRow as GiftRowData } from "@/actions/donations/giving-actions";

const gift = (id: string, title: string): GiftRowData => ({
  id,
  kind: "donation",
  title,
  owner: "Lagos Education Trust",
  image: null,
  href: `/causes/${id}`,
  amount: 25_000,
  date: "2026-10-05T12:00:00Z",
  status: "in-progress",
  reference: null,
});

const initialGifts = [
  gift("c-1", "Hope Water Drive"),
  gift("c-2", "Book Drive"),
];

const baseProps = {
  period: "all" as const,
  filter: "all" as const,
  q: "",
  limit: 20,
  pageSize: 20,
  gifts: initialGifts,
  hasMoreGifts: true,
};

describe("GiftsPanel (in-place search)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the initial server-rendered list and the heading", () => {
    render(<GiftsPanel {...baseProps} />);

    expect(screen.getByText("Every gift")).toBeInTheDocument();
    expect(screen.getByText("Hope Water Drive")).toBeInTheDocument();
    expect(screen.getByText("Book Drive")).toBeInTheDocument();
  });

  it("re-fetches and re-renders the list when the header search commits", async () => {
    (getGivingOverview as jest.Mock).mockResolvedValue({
      gifts: [gift("c-9", "School Meals Fund")],
      hasMoreGifts: false,
    });

    render(<GiftsPanel {...baseProps} />);

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("giving:search", { detail: { q: "school" } }),
      );
    });

    await waitFor(() =>
      expect(getGivingOverview).toHaveBeenCalledWith({
        period: "all",
        filter: "all",
        q: "school",
        limit: 20,
      }),
    );

    expect(screen.getByText("School Meals Fund")).toBeInTheDocument();
    expect(screen.queryByText("Hope Water Drive")).toBeNull();
  });

  it("resets paging on a new search", async () => {
    (getGivingOverview as jest.Mock).mockResolvedValue({
      gifts: [],
      hasMoreGifts: false,
    });

    render(<GiftsPanel {...baseProps} limit={60} />);
    fireEvent.click(screen.getByRole("button", { name: /show more gifts/i }));
    expect(getGivingOverview).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 80 }),
    );

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("giving:search", { detail: { q: "again" } }),
      );
    });
    expect(getGivingOverview).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "again", limit: 60 }),
    );
  });

  it("shows the empty-state copy for a query with no matches", async () => {
    (getGivingOverview as jest.Mock).mockResolvedValue({
      gifts: [],
      hasMoreGifts: false,
    });

    render(<GiftsPanel {...baseProps} />);
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("giving:search", { detail: { q: "nonexistent" } }),
      );
    });

    expect(
      screen.getByText(/No gifts match “nonexistent”\./),
    ).toBeInTheDocument();
  });
});
