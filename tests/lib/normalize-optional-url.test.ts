import { normalizeOptionalUrl } from "@/lib/url/normalize-optional-url";

describe("normalizeOptionalUrl", () => {
  it("returns null for blank input", () => {
    expect(normalizeOptionalUrl("  ", "website")).toBeNull();
    expect(normalizeOptionalUrl(undefined, "website")).toBeNull();
  });

  it("adds https:// to a bare domain", () => {
    expect(normalizeOptionalUrl("korahq.com", "website")).toBe(
      "https://korahq.com/",
    );
  });

  it("keeps an explicit http(s) URL", () => {
    expect(normalizeOptionalUrl("http://korahq.com/x", "website")).toBe(
      "http://korahq.com/x",
    );
  });

  it("rejects text with spaces even where the URL parser would encode it", () => {
    expect(() => normalizeOptionalUrl("not a url", "website")).toThrow(
      "Enter a valid website URL.",
    );
    expect(() => normalizeOptionalUrl("localhost", "website")).toThrow();
  });

  it("throws a labelled error for something that is not a URL", () => {
    expect(() => normalizeOptionalUrl("not a url", "Instagram")).toThrow(
      "Enter a valid Instagram URL.",
    );
  });
});
