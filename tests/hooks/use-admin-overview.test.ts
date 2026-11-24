jest.mock("@/actions/admin/admin-overview-actions", () => ({
  getAdminOverview: jest.fn(),
}));
import type { AdminOverviewData } from "@/actions/admin/admin-overview-actions";
import { buildOverview, waitingLabel } from "@/hooks/use-admin-overview";

const now = new Date("2026-11-24T12:00:00Z");
const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

function raw(overrides: Partial<AdminOverviewData> = {}): AdminOverviewData {
  const none = { count: 0, oldest: null };
  return {
    role: "admin",
    generatedAt: now,
    label: "November 2026 to date",
    queues: {
      campaigns: { count: 1, oldest: ago(24 * 35) },
      kyc: { count: 3, oldest: ago(5) },
      receipts: none,
      petitions: none,
      reports: { count: 2, oldest: ago(30) },
    },
    reportsOverdue: 1,
    waiting: [
      {
        type: "KYC",
        ref: "user-1",
        title: "Ada Obi",
        detail: "didit",
        owner: "Ada Obi",
        created_at: ago(24 * 4),
        due_at: null,
      },
      {
        type: "Report",
        ref: "rep-1",
        title: "Spam",
        detail: "comment",
        owner: null,
        created_at: ago(30),
        due_at: ago(2),
      },
    ],
    campaigns: { active: 4, inactive: 2, paused: 1 },
    money: {
      totals: {
        total: 1_200_000,
        gifts: 4,
        donors: 3,
        prev_total: 1_000_000,
        prev_donors: 2,
      },
      series: { values: [1, 2], previous: [1, 1] },
      labels: ["1 Nov", "2 Nov"],
    },
    ...overrides,
  };
}

test.each([
  [0.2, "<1h"],
  [5, "5h"],
  [47, "47h"],
  [48, "2d"],
  [24 * 35, "35d"],
])("%s hours waiting reads %s", (hours, label) => {
  expect(waitingLabel(ago(hours), now)).toBe(label);
});

test("admin overview totals the queues and flags SLA breaches", () => {
  const data = buildOverview(raw());
  expect(data.totalWaiting).toBe(6);
  expect(data.metrics.map((m) => m.label)).toEqual([
    "Raised this month",
    "Items in review",
    "Open reports",
    "Active campaigns",
  ]);
  expect(data.metrics[0]).toMatchObject({ value: "₦1.2M", change: "+20%" });
  const queues = Object.fromEntries(data.queues.map((q) => [q.label, q]));
  expect(queues.Campaigns).toMatchObject({ note: "Oldest 35d", tone: "gold" });
  expect(queues.KYC).toMatchObject({ note: "Oldest 5h", tone: "neutral" });
  expect(queues.Receipts).toMatchObject({ note: "All clear", tone: "green" });
  expect(queues.Reports).toMatchObject({ note: "1 over SLA", tone: "red" });
  expect(data.donations).not.toBeNull();
});

test("waiting items link to their review page and carry status", () => {
  const [kyc, report] = buildOverview(raw()).waiting;
  expect(kyc).toMatchObject({
    href: "/dashboard/admin/users/kyc/user-1",
    status: "Waiting 3d+",
    waiting: "4d",
  });
  expect(report).toMatchObject({
    href: "/dashboard/admin/reports",
    status: "Over SLA",
    owner: "Unknown user",
  });
});

test("manager overview has no money figures", () => {
  const data = buildOverview(raw({ role: "manager", money: null }));
  expect(data.donations).toBeNull();
  expect(data.metrics.map((m) => m.label)).toEqual([
    "Items in review",
    "Longest wait",
    "Open reports",
    "Active campaigns",
  ]);
  expect(data.metrics[1].value).toBe("35d");
});
