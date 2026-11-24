import { render, screen } from "@testing-library/react";
import { AdminOverview } from "@/components/admin/overview/admin-overview";
import type { OverviewData } from "@/components/admin/workspace/types";

const useAdminOverview = jest.fn();
jest.mock("@/hooks/use-admin-overview", () => ({
  useAdminOverview: () => useAdminOverview(),
}));
jest.mock("@/components/admin/workspace/charts", () => ({
  LinePlot: () => <svg data-testid="line-plot" />,
}));

function fixture(overrides: Partial<OverviewData> = {}): OverviewData {
  return {
    role: "admin",
    generatedAt: "2026-11-24T10:00:00.000Z",
    label: "November 2026 to date",
    metrics: [
      {
        label: "Raised this month",
        value: "₦4.2M",
        change: "+12%",
        tone: "green",
      },
      { label: "Items in review", value: "4" },
    ],
    donations: { values: [1, 2], previous: [1, 1], labels: ["1 Nov", "2 Nov"] },
    donationsTotal: "₦4.2M",
    queues: [
      {
        label: "KYC",
        href: "/dashboard/admin/users/kyc",
        count: 3,
        note: "Oldest 2d",
        tone: "neutral",
      },
      {
        label: "Reports",
        href: "/dashboard/admin/reports",
        count: 1,
        note: "1 over SLA",
        tone: "red",
      },
    ],
    waiting: [
      {
        id: "KYC-1",
        name: "Ada Obi",
        detail: "didit",
        initials: "AO",
        status: "Waiting 3d+",
        tone: "gold",
        href: "/dashboard/admin/users/kyc/u1",
        type: "KYC",
        owner: "Ada Obi",
        waiting: "4d",
      },
    ],
    totalWaiting: 4,
    ...overrides,
  };
}

function renderOverview(state: object) {
  useAdminOverview.mockReturnValue({ refetch: jest.fn(), ...state });
  return render(
    <AdminOverview
      greeting="Good morning, Kemi"
      dateLine="Tuesday 24 November"
    />,
  );
}

test("shows greeting, waiting count, queues and the waiting table", () => {
  renderOverview({ data: fixture() });
  expect(
    screen.getByRole("heading", { name: "Good morning, Kemi" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/4 items waiting across all queues/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /KYC.*Oldest 2d.*3/ }),
  ).toHaveAttribute("href", "/dashboard/admin/users/kyc");
  expect(screen.getByText("1 over SLA")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Ada Obi/ })).toHaveAttribute(
    "href",
    "/dashboard/admin/users/kyc/u1",
  );
  expect(screen.getByTestId("line-plot")).toBeInTheDocument();
});

test("hides the donations chart when the role has no money data", () => {
  renderOverview({ data: fixture({ donations: null }) });
  expect(screen.queryByTestId("line-plot")).not.toBeInTheDocument();
});

test("shows an empty state when nothing is waiting", () => {
  renderOverview({ data: fixture({ waiting: [], totalWaiting: 0 }) });
  expect(screen.getByText("Nothing is waiting for review")).toBeInTheDocument();
  expect(screen.getByText(/0 items waiting/)).toBeInTheDocument();
});

test("shows the real error message and retries", () => {
  renderOverview({ error: new Error("Unauthorized") });
  expect(screen.getByRole("alert")).toHaveTextContent("Unauthorized");
});

test("shows a skeleton while loading", () => {
  const { container } = renderOverview({ isLoading: true });
  expect(container.querySelector("[aria-busy]")).toBeInTheDocument();
});
