export type ItemRow = {
  name: string;
  price: string;
  note: string;
  imageUrl: string;
  uploading: boolean;
};

export type RowFieldErrors = Partial<Record<"name" | "price", string>>;
export type RowErrors = Record<number, RowFieldErrors>;

export const emptyRow = (): ItemRow => ({
  name: "",
  price: "",
  note: "",
  imageUrl: "",
  uploading: false,
});

export const isRowBlank = (row: ItemRow) =>
  !row.name.trim() && !row.price.trim() && !row.note.trim() && !row.imageUrl;

/** The shape `wishlistItemSchema` and `addWishlistItem` both accept. */
export const toItemInput = (row: ItemRow) => ({
  name: row.name,
  price: Number(row.price) || 0,
  note: row.note.trim() || undefined,
  imageUrl: row.imageUrl || undefined,
});

/**
 * Maps zod issues from an items array back onto the rows that were validated.
 * `rowIndexes[i]` is the position in the full list of the i-th validated row.
 */
export function rowErrorsFromIssues(
  issues: { path: (string | number)[]; message: string }[],
  rowIndexes: number[],
): RowErrors {
  const errors: RowErrors = {};
  for (const issue of issues) {
    const position = issue.path[0];
    const field = issue.path[1];
    if (typeof position !== "number") continue;
    if (field !== "name" && field !== "price") continue;
    const rowIndex = rowIndexes[position];
    if (rowIndex === undefined) continue;
    errors[rowIndex] = { ...errors[rowIndex], [field]: issue.message };
  }
  return errors;
}
