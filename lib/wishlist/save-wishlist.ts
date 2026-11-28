import {
  addWishlistItem,
  createWishlist,
} from "@/actions/wishlists/wishlist-actions";
import { toItemInput, type ItemRow } from "@/lib/wishlist/item-rows";

type SaveResult =
  | { ok: false; error: string }
  | { ok: true; slug: string; notice: string | null };

function partialSaveNotice(added: number, total: number, firstError: string) {
  return added === 0
    ? `${firstError} Add your items below.`
    : `${added} of ${total} items saved. ${firstError} Add the rest below.`;
}

/** Creates the wishlist, then adds each row. Item failures don't undo it. */
export async function saveWishlistWithItems(input: {
  title: string;
  message: string;
  isPublic?: boolean;
  rows: ItemRow[];
}): Promise<SaveResult> {
  const created = await createWishlist({
    title: input.title,
    message: input.message || undefined,
    isPublic: input.isPublic,
  });
  if (!created.success || !created.data) {
    return { ok: false, error: created.error || "Could not save the wishlist" };
  }

  let added = 0;
  let firstError: string | null = null;
  for (const row of input.rows) {
    const result = await addWishlistItem(created.data.id, toItemInput(row));
    if (result.success) added += 1;
    else if (!firstError) firstError = result.error || null;
  }

  return {
    ok: true,
    slug: created.data.slug,
    notice: firstError
      ? partialSaveNotice(added, input.rows.length, firstError)
      : null,
  };
}
