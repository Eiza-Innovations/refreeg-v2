import { parseSocialLinks } from "@/lib/petitions/social-links";

describe("parseSocialLinks", () => {
  it("returns empty links when there is nothing stored", () => {
    expect(parseSocialLinks(null)).toEqual({
      twitter: "",
      facebook: "",
      instagram: "",
      linkedin: "",
    });
  });

  it("reads a JSON string and an object alike", () => {
    const links = { twitter: "https://x.com/a", linkedin: "https://l.in/a" };
    expect(parseSocialLinks(JSON.stringify(links))).toMatchObject(links);
    expect(parseSocialLinks(links)).toMatchObject(links);
  });

  it("ignores malformed JSON", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(parseSocialLinks("{nope").twitter).toBe("");
    spy.mockRestore();
  });
});
