import { optionLabel, optionValue } from "@/lib/options/option-label";

const options = [
  { label: "All", value: "all" },
  { label: "Active", value: "approved" },
] as const;

describe("option helpers", () => {
  it("finds a label by value, falling back to the value", () => {
    expect(optionLabel(options, "approved")).toBe("Active");
    expect(optionLabel(options, "other")).toBe("other");
  });

  it("keeps a known value and falls back for unknown or missing ones", () => {
    expect(optionValue(options, "approved", "all")).toBe("approved");
    expect(optionValue(options, "nope", "all")).toBe("all");
    expect(optionValue(options, undefined, "all")).toBe("all");
  });
});
