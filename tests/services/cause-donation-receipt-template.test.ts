import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

const TEMPLATE_DIR = path.join(process.cwd(), "services", "templates");

const load = (name: string) =>
  Handlebars.compile(
    fs.readFileSync(path.join(TEMPLATE_DIR, `${name}.html`), "utf-8"),
  );

describe("cause donation receipt template", () => {
  const render = (context: Record<string, unknown>) =>
    load("cause-donation-receipt")(context) as string;

  const base = {
    donorName: "Adaeze",
    causeTitle: "Clean Water for Owerri",
    amount: "25,000",
    causeUrl: "https://refreeg.com/causes/c-1",
    reference: "PSK_abc123",
    showMessage: false,
    donorMessage: undefined as string | undefined,
    isAnonymous: false,
    currentYear: 2026,
  };

  it("addresses the giver, shows the amount, reference and cause link", () => {
    const html = render(base);

    expect(html).toContain("Hi Adaeze");
    expect(html).toContain("Clean Water for Owerri");
    expect(html).toContain("&#8358;25,000");
    expect(html).toContain("Reference: PSK_abc123");
    expect(html).toContain('href="https://refreeg.com/causes/c-1"');
    expect(html).toContain("Donation receipt");
  });

  it("echoes the giver's own note when there is one", () => {
    const html = render({
      ...base,
      showMessage: true,
      donorMessage: "Go well",
    });

    expect(html).toContain("Your note: &ldquo;Go well&rdquo;");
  });

  it("tells anonymous givers their name stays hidden", () => {
    const html = render({ ...base, isAnonymous: true });

    expect(html).toContain("give anonymously");
  });

  it("hides the reference row when no reference exists", () => {
    const html = render({ ...base, reference: null });

    expect(html).not.toContain("Reference:");
  });

  it("stays free of em dashes", () => {
    const html = render(base);

    expect(html).not.toMatch(/—/);
  });
});
