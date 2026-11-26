import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

const TEMPLATE_DIR = path.join(process.cwd(), "services", "templates");

const load = (name: string) =>
  Handlebars.compile(
    fs.readFileSync(path.join(TEMPLATE_DIR, `${name}.html`), "utf-8"),
  );

const baseContext = {
  ownerName: "Nomso",
  giverName: "Adaeze",
  wishlistTitle: "Nomso's Wishlist",
  itemName: "A new study desk",
  amount: "2,500",
  wishlistUrl: "https://refreeg.com/nomso/nomsos-wishlist",
  showNote: false,
  giftNote: undefined as string | undefined,
  seasonal: false,
  currentYear: 2026,
};

describe("wishlist email templates seasonal voice", () => {
  it("adds the one seasonal line to the contribution email only in season", () => {
    const render = load("wishlist-contribution-received");

    const everyday = render({ ...baseContext, seasonal: false });
    expect(everyday).not.toContain("Christmas");
    expect(everyday).toContain("Adaeze just gave towards");

    const seasonal = render({ ...baseContext, seasonal: true });
    expect(seasonal).toContain(
      "It&rsquo;s the season, and this gift counts toward a Christmas wish on your list.",
    );
    // The seasonal line never displaces the substantive copy.
    expect(seasonal).toContain("Adaeze just gave towards");
    expect(seasonal).toContain("View your wishlist");
  });

  it("adds the one seasonal line to the funded email only in season", () => {
    const render = load("wishlist-item-funded");

    const everyday = render({ ...baseContext, seasonal: false });
    expect(everyday).not.toContain("Christmas");
    expect(everyday).toContain("just added up to its full price");

    const seasonal = render({ ...baseContext, seasonal: true });
    expect(seasonal).toContain(
      "A Christmas wish, fully paid for. Just like that.",
    );
    expect(seasonal).toContain("just added up to its full price");
  });

  it("keeps the gift-note block working alongside the seasonal flag", () => {
    const render = load("wishlist-contribution-received");

    const withNote = render({
      ...baseContext,
      seasonal: true,
      showNote: true,
      giftNote: "Merry Christmas, Nomso!",
    });
    expect(withNote).toContain("Merry Christmas, Nomso!");

    const withoutNote = render({
      ...baseContext,
      seasonal: true,
      showNote: false,
    });
    expect(withoutNote).not.toContain("giftNote");
  });
});
