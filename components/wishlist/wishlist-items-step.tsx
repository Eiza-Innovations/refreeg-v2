"use client";

import { Gift, Plus } from "lucide-react";

import { FieldError } from "@/components/ui/field-error";
import { ItemRowCard } from "@/components/wishlist/item-row-card";
import type { WishlistItemRows } from "@/hooks/use-wishlist-item-rows";
import { WISHLIST_ITEM_CAP } from "@/lib/schemas/wishlist.schema";
import { cn } from "@/lib/utils";

export function WishlistItemsStep({
  title,
  itemRows,
  serverError,
}: {
  title: string;
  itemRows: WishlistItemRows;
  serverError: string | null;
}) {
  const { rows, errors } = itemRows;
  const atCap = rows.length >= WISHLIST_ITEM_CAP;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-lg border border-hairline bg-bone px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface text-forest shadow-flat">
          <Gift className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
          {title}
        </p>
      </div>

      {rows.map((row, index) => (
        <ItemRowCard
          key={index}
          index={index}
          row={row}
          errors={errors[index]}
          removable={rows.length > 1}
          removeDisabled={itemRows.uploading}
          onChange={(patch) => itemRows.updateRow(index, patch)}
          onRemove={() => itemRows.removeRow(index)}
          onPickImage={(file) => itemRows.uploadImage(index, file)}
          onRemoveImage={() => itemRows.removeImage(index)}
        />
      ))}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={itemRows.addRow}
          disabled={atCap}
          className={cn(
            "flex items-center gap-2 rounded-full border border-dashed border-ink/30 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/60 hover:bg-ink/5",
            atCap &&
              "cursor-not-allowed opacity-50 hover:border-ink/30 hover:bg-transparent",
          )}
        >
          <Plus className="h-4 w-4" />
          Add another item
        </button>
        <span className="text-xs text-ink/60">
          {rows.length} of {WISHLIST_ITEM_CAP}
        </span>
      </div>

      <FieldError message={serverError ?? undefined} />
    </div>
  );
}
