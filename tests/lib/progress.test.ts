import { goalPercent } from "@/lib/progress";

describe("goalPercent", () => {
  it("rounds the share of the goal reached", () => {
    expect(goalPercent(1, 3)).toBe(33);
  });

  it("caps at 100", () => {
    expect(goalPercent(600, 500)).toBe(100);
  });

  it("is 0 without a goal", () => {
    expect(goalPercent(5, 0)).toBe(0);
  });
});
