import { faqCategories } from "@/app/faq/_data/faqs";

const allItems = faqCategories.flatMap((category) => category.items);

describe("FAQ data", () => {
  it("answers what can I crowdfund, with the ideas that used to live in the header", () => {
    const item = allItems.find((q) => q.id === "what-can-i-crowdfund");

    expect(item?.question).toBe("What can I crowdfund on Refreeg?");
    for (const idea of [
      "Businesses",
      "Nonprofits",
      "Disaster relief",
      "Healthcare",
      "Creators",
      "wishlist",
    ]) {
      expect(item?.answer).toContain(idea);
    }
    expect(item?.answer).toContain("refreeg.com/crowdfund");
  });

  it("covers the wishlist basics", () => {
    const what = allItems.find((q) => q.id === "what-is-a-wishlist");
    const cap = allItems.find((q) => q.id === "wishlist-items");
    const giving = allItems.find((q) => q.id === "wishlist-giving");

    expect(what?.answer).toContain("refreeg.com/wishlist");
    expect(cap?.answer).toContain("8 items");
    expect(giving?.question).toBe("Do gifts to wishlists count as giving too?");
  });

  it("keeps every answer free of em dashes", () => {
    for (const item of allItems) {
      expect(item.answer).not.toMatch(/—/);
    }
  });
});
