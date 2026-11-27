import {
  emptyRow,
  isRowBlank,
  rowErrorsFromIssues,
  toItemInput,
} from "@/lib/wishlist/item-rows";

describe("wishlist item rows", () => {
  it("treats a row with only a photo as filled", () => {
    expect(isRowBlank(emptyRow())).toBe(true);
    expect(isRowBlank({ ...emptyRow(), imageUrl: "k.jpg" })).toBe(false);
  });

  it("maps a row to the item input", () => {
    expect(
      toItemInput({ ...emptyRow(), name: "Desk", price: "80000", note: " " }),
    ).toEqual({
      name: "Desk",
      price: 80000,
      note: undefined,
      imageUrl: undefined,
    });
  });

  it("maps issues back to the original row positions", () => {
    const errors = rowErrorsFromIssues(
      [
        { path: [0, "price"], message: "too low" },
        { path: [1, "name"], message: "missing" },
        { path: [1, "price"], message: "too low" },
      ],
      [1, 3],
    );
    expect(errors).toEqual({
      1: { price: "too low" },
      3: { name: "missing", price: "too low" },
    });
  });
});
