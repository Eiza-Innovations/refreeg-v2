import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

const TEMPLATE_DIR = path.join(process.cwd(), "services", "templates");

const load = (name: string) =>
  Handlebars.compile(
    fs.readFileSync(path.join(TEMPLATE_DIR, `${name}.html`), "utf-8"),
  );

// Normalize HTML whitespace so assertions are not affected by template formatting.
const normalize = (html: string) => html.replace(/\s+/g, " ").trim();

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

describe("wishlist gift receipt template", () => {
  const base = {
    ...baseContext,
    giverName: "Adaeze",
    reference: "PSK_abc123",
    isAnonymous: false,
  };

  it("addresses the giver, shows the amount, reference and wishlist link", () => {
    const html = normalize(load("wishlist-gift-receipt")(base));

    expect(html).toContain("Your gift went through, thank you");
    expect(html).toContain("Hi Adaeze");
    expect(html).toContain("&#8358;2,500");
    expect(html).toContain("Reference: PSK_abc123");
    expect(html).toContain("View the wishlist");
    expect(html).toContain("Keep this email for your records");
    expect(html).not.toContain("give anonymously");
  });

  it("tells anonymous givers their name stays hidden", () => {
    const html = normalize(
      load("wishlist-gift-receipt")({ ...base, isAnonymous: true }),
    );

    expect(html).toContain("the owner won&rsquo;t see your name");
  });

  it("echoes the giver's own note when there is one", () => {
    const html = normalize(
      load("wishlist-gift-receipt")({
        ...base,
        showNote: true,
        giftNote: "Merry Christmas, Nomso!",
      }),
    );

    expect(html).toContain("Your note: &ldquo;Merry Christmas, Nomso!&rdquo;");
  });

  it("hides the reference row when no reference exists", () => {
    const html = normalize(
      load("wishlist-gift-receipt")({ ...base, reference: null }),
    );

    expect(html).not.toContain("Reference:");
  });

  it("carries the seasonal line in season and stays plain otherwise", () => {
    const render = load("wishlist-gift-receipt");

    const everyday = normalize(render({ ...base }));
    expect(everyday).not.toContain("Christmas");

    const seasonal = normalize(render({ ...base, seasonal: true }));
    expect(seasonal).toContain(
      "It&rsquo;s the season, and your gift counts toward a Christmas wish on this list.",
    );
  });
});

describe("wishlist email templates seasonal voice", () => {
  it("adds the one seasonal line to the contribution email only in season", () => {
    const render = load("wishlist-contribution-received");

    const everyday = normalize(render({ ...baseContext, seasonal: false }));
    expect(everyday).not.toContain("Christmas");
    expect(everyday).toContain("Adaeze just gave towards");

    const seasonal = normalize(render({ ...baseContext, seasonal: true }));
    expect(seasonal).toContain(
      "It&rsquo;s the season, and this gift counts toward a Christmas wish on your list.",
    );

    expect(seasonal).toContain("Adaeze just gave towards");
    expect(seasonal).toContain("View your wishlist");
  });

  it("adds the one seasonal line to the funded email only in season", () => {
    const render = load("wishlist-item-funded");

    const everyday = normalize(render({ ...baseContext, seasonal: false }));
    expect(everyday).not.toContain("Christmas");
    expect(everyday).toContain("just added up to its full price");

    const seasonal = normalize(render({ ...baseContext, seasonal: true }));
    expect(seasonal).toContain(
      "A Christmas wish, fully paid for. Just like that.",
    );
    expect(seasonal).toContain("just added up to its full price");
  });

  it("keeps the gift-note block working alongside the seasonal flag", () => {
    const render = load("wishlist-contribution-received");

    const withNote = normalize(
      render({
        ...baseContext,
        seasonal: true,
        showNote: true,
        giftNote: "Merry Christmas, Nomso!",
      }),
    );

    expect(withNote).toContain("Merry Christmas, Nomso!");

    const withoutNote = normalize(
      render({
        ...baseContext,
        seasonal: true,
        showNote: false,
      }),
    );

    expect(withoutNote).not.toContain("giftNote");
  });
});

describe("wishlist gift reminder template", () => {
  const render = (patch: Record<string, unknown> = {}) =>
    load("wishlist-gift-reminder")({
      giverName: "Adaeze",
      itemName: "A new study desk",
      wishlistTitle: "Nomso's Wishlist",
      wishlistUrl: "https://refreeg.com/nomso/nomsos-wishlist",
      currentYear: 2026,
      ...patch,
    });

  it("points the giver back at the unfinished gift", () => {
    const html = normalize(render());

    expect(html).toContain("You didn&rsquo;t finish your gift");
    expect(html).toContain("Hi Adaeze");
    expect(html).toContain("&ldquo;A new study desk&rdquo;");
    expect(html).toContain("Finish your gift");
    expect(html).toContain("https://refreeg.com/nomso/nomsos-wishlist");
  });

  it("uses the unified footer with a settings link and the contact line", () => {
    const html = normalize(render());

    expect(html).toContain("Manage email preferences in");
    expect(html).toContain("support@refreeg.com");
    expect(html).toContain("+234 901 744 6760");
    expect(html).toContain("&copy; 2026 RefreeG");
  });

  it("falls back to a neutral greeting when no name was given", () => {
    const html = normalize(render({ giverName: "" }));

    expect(html).toContain("Hi, you started giving towards");
    expect(html).not.toContain("Hi ,");
  });
});
