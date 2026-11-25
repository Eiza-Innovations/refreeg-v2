/**
 * @jest-environment node
 */
import { reportingWindow } from "@/lib/campaign-analytics/period";
import { toSeries } from "@/lib/operations-analytics/buckets";
import { formatHours } from "@/lib/campaign-analytics/format";

// 15 Nov 2026, 10:30 in Lagos.
const now = new Date("2026-11-15T09:30:00Z");

describe("toSeries", () => {
  it("buckets today by hour up to the current hour", () => {
    const series = toSeries("day", reportingWindow("day", now), [
      { bucket: "2026-11-15T09", count: 4 },
    ]);
    expect(series.labels[0]).toBe("00:00");
    expect(series.labels.at(-1)).toBe("10:00");
    expect(series.values[9]).toBe(4);
    expect(series.currentIndex).toBe(10);
  });

  it("buckets the month by day and the year by month", () => {
    const month = toSeries("month", reportingWindow("month", now), [
      { bucket: "2026-11-03T00", count: 2 },
    ]);
    expect(month.labels).toHaveLength(15);
    expect(month.values[2]).toBe(2);

    const year = toSeries("year", reportingWindow("year", now), [
      { bucket: "2026-02-01T00", count: 7 },
    ]);
    expect(year.labels.slice(0, 2)).toEqual(["Jan", "Feb"]);
    expect(year.values[1]).toBe(7);
    expect(year.labels).toHaveLength(11);
  });
});

describe("formatHours", () => {
  it.each([
    [null, "—"],
    [0.4, "<1h"],
    [30, "30h"],
    [70, "2.9d"],
  ])("%s → %s", (hours, text) => {
    expect(formatHours(hours)).toBe(text);
  });
});
