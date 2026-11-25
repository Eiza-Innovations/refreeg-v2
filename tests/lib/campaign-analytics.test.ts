/**
 * @jest-environment node
 */
jest.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    campaign_funnel_events: { findFirst: jest.fn(), createMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { reportingWindow } from "@/lib/campaign-analytics/period";
import { recordPaymentOutcome } from "@/actions/causes/funnel-actions";
import { failureReason, worstSteps } from "@/lib/campaign-analytics/funnel";
import type { SegmentRow } from "@/types/campaign-analytics-types";

const mockPrisma = prisma as any;

describe("reportingWindow", () => {
  // 15 Nov 2026, 10:00 in Lagos (09:00 UTC).
  const now = new Date("2026-11-15T09:00:00Z");

  it("compares today with the same hours yesterday", () => {
    const w = reportingWindow("day", now);
    expect(w.from.toISOString()).toBe("2026-11-14T23:00:00.000Z");
    expect(w.previousFrom.toISOString()).toBe("2026-11-13T23:00:00.000Z");
    expect(w.previousTo.toISOString()).toBe("2026-11-14T09:00:00.000Z");
    expect(w.days).toBe(1);
  });

  it("compares month to date with the same span last month", () => {
    const w = reportingWindow("month", now);
    expect(w.from.toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(w.previousFrom.toISOString()).toBe("2026-09-30T23:00:00.000Z");
    expect(w.previousTo.toISOString()).toBe("2026-10-15T09:00:00.000Z");
    expect(w.days).toBe(15);
    expect(w.label).toBe("November");
  });

  it("caps the previous window at the start of the current one", () => {
    const w = reportingWindow("month", new Date("2026-03-31T12:00:00Z"));
    expect(w.previousTo.getTime()).toBeLessThanOrEqual(w.from.getTime());
  });
});

describe("failureReason", () => {
  it.each([
    [{ status: "failed", channel: "card" }, "card_declined"],
    [{ status: "abandoned", channel: "card" }, "abandoned"],
    [{ status: "abandoned", channel: "bank_transfer" }, "transfer_incomplete"],
    [
      { status: "failed", gateway_response: "Transaction timed out" },
      "timeout",
    ],
  ])("%o → %s", (data, reason) => {
    expect(failureReason(data)).toBe(reason);
  });
});

describe("worstSteps", () => {
  const row = (overrides: Partial<SegmentRow>): SegmentRow => ({
    device: "desktop",
    big_gift: false,
    first_time: false,
    no_photo: false,
    view: 100,
    give: 50,
    amount: 40,
    payment: 30,
    paid: 20,
    ...overrides,
  });

  it("reports the step where a segment converts worst vs everyone", () => {
    const [android] = worstSteps([
      row({}),
      row({
        device: "android",
        view: 100,
        give: 10,
        amount: 8,
        payment: 6,
        paid: 4,
      }),
    ]);
    expect(android.segment).toBe("Mobile web, Android");
    expect(android.step).toBe("give");
    expect(android.dropVsAverage).toBeLessThan(0);
  });

  it("skips segments that do as well as average", () => {
    expect(worstSteps([row({})])).toEqual([]);
  });
});

describe("recordPaymentOutcome", () => {
  beforeEach(() => jest.clearAllMocks());

  it("ignores payments the web funnel didn't start", async () => {
    mockPrisma.campaign_funnel_events.findFirst.mockResolvedValue(null);
    await recordPaymentOutcome("ref_1", { status: "success" });
    expect(mockPrisma.campaign_funnel_events.createMany).not.toHaveBeenCalled();
  });

  it("records a failed step with its reason on the started session", async () => {
    mockPrisma.campaign_funnel_events.findFirst.mockResolvedValue({
      cause_id: "c1",
      session_id: "s1",
      device: "android",
      amount: 5000,
      user_id: null,
      first_time: null,
    });
    await recordPaymentOutcome("ref_1", { status: "failed", channel: "card" });
    expect(mockPrisma.campaign_funnel_events.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          cause_id: "c1",
          session_id: "s1",
          step: "failed",
          reason: "card_declined",
        }),
      ],
      skipDuplicates: true,
    });
  });
});
