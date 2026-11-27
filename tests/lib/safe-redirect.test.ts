import { safeRedirect } from "@/lib/auth/safe-redirect";

describe("safeRedirect", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirect("/dashboard/causes?x=1")).toBe("/dashboard/causes?x=1");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeRedirect("//evil.com")).toBeNull();
    expect(safeRedirect("https://evil.com")).toBeNull();
    expect(safeRedirect("evil")).toBeNull();
  });

  it("rejects empty values", () => {
    expect(safeRedirect(null)).toBeNull();
    expect(safeRedirect(undefined)).toBeNull();
    expect(safeRedirect("")).toBeNull();
  });
});
