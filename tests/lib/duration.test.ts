import { daysLeft, endDateFromDaysActive } from "@/lib/duration";

const DAY = 24 * 60 * 60 * 1000;

describe("duration helpers", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-11-26T12:00:00Z"));
  });
  afterEach(() => jest.useRealTimers());

  it("ends a run `daysActive` days from now", () => {
    expect(endDateFromDaysActive(3)?.getTime()).toBe(Date.now() + 3 * DAY);
  });

  it("has no end date without days", () => {
    expect(endDateFromDaysActive(null)).toBeUndefined();
  });

  it("counts whole days left and never goes negative", () => {
    expect(daysLeft("2026-11-24T12:00:00Z", 5)).toBe(3);
    expect(daysLeft("2026-11-01T12:00:00Z", 5)).toBe(0);
    expect(daysLeft("2026-11-24T12:00:00Z", null)).toBeNull();
  });
});
