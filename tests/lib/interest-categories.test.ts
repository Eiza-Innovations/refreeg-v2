import { campaignCategoryStyles } from "@/lib/causes/campaign-categories";
import {
  interestLabel,
  interestOptions,
} from "@/lib/causes/interest-categories";

describe("interestOptions", () => {
  it("offers exactly the campaign categories, with their names", () => {
    expect(interestOptions.map((o) => o.label)).toEqual(
      campaignCategoryStyles.map((c) => c.name),
    );
    expect(interestOptions.map((o) => o.campaignCategoryId)).toEqual(
      campaignCategoryStyles.map((c) => c.id),
    );
  });

  it("keeps the older ids for the three categories people may already have saved", () => {
    const idFor = (category: string) =>
      interestOptions.find((o) => o.campaignCategoryId === category)?.id;

    expect(idFor("disaster")).toBe("disaster-relief");
    expect(idFor("business")).toBe("small-business");
    expect(idFor("environment")).toBe("climate");
    expect(idFor("education")).toBe("education");
  });

  it("gives every option a unique id and an icon", () => {
    const ids = interestOptions.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(interestOptions.every((o) => !!o.icon)).toBe(true);
  });

  it("no longer lists categories that have no campaigns behind them", () => {
    const ids = interestOptions.map((o) => o.id);
    for (const gone of [
      "water",
      "women-girls",
      "accountability",
      "skills-bounties",
    ]) {
      expect(ids).not.toContain(gone);
    }
  });

  it("names a saved interest, falling back to the id for one no longer offered", () => {
    expect(interestLabel("disaster-relief")).toBe("Disaster Relief");
    expect(interestLabel("community")).toBe("Community");
    expect(interestLabel("water")).toBe("water");
  });
});
