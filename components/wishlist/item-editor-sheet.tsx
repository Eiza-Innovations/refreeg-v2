"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import {
  addWishlistItem,
  updateWishlistItem,
} from "@/actions/wishlists/wishlist-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDialogContent } from "@/components/ui/responsive-dialog-content";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { useValidator } from "@/hooks/use-validator";
import { wishlistItemSchema } from "@/lib/schemas/wishlist.schema";
import { formatNaira } from "@/components/giving/format";
import type { WishlistItem } from "@/types";
import { cn } from "@/lib/utils";

const label =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55";

export interface ItemEditorSheetProps {
  wishlistId: string;
  /** Null opens the sheet in add mode; an item opens it in edit mode. */
  item: WishlistItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (item: WishlistItem) => void;
}

export function ItemEditorSheet({
  wishlistId,
  item,
  open,
  onOpenChange,
  onSaved,
}: ItemEditorSheetProps) {
  const editing = Boolean(item);
  const priceLocked = Boolean(item && item.contributed > 0);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", price: "", note: "" });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    setForm({
      name: item?.name ?? "",
      price: item ? String(item.price) : "",
      note: item?.note ?? "",
    });
  }, [open, item]);

  const { errors, validate, clearError } = useValidator({
    store: { name: form.name, price: Number(form.price) || 0, note: form.note },
    schema: wishlistItemSchema,
  });

  const save = async () => {
    setServerError(null);
    if (!validate()) return;
    setSaving(true);

    const result =
      editing && item
        ? await updateWishlistItem(item.id, {
            name: form.name,
            ...(priceLocked ? {} : { price: Number(form.price) }),
            note: form.note || undefined,
          })
        : await addWishlistItem(wishlistId, {
            name: form.name,
            price: Number(form.price),
            note: form.note || undefined,
          });
    setSaving(false);

    if (!result.success || !result.data) {
      setServerError(result.error || "Could not save the item");
      return;
    }
    onSaved(result.data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[92vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-none bg-transparent p-0 shadow-none sm:max-w-[452px] [&>button]:hidden">
        <DialogTitle className="sr-only">
          {editing ? `Edit ${item?.name}` : "Add an item"}
        </DialogTitle>
        <div className="rounded-3xl bg-surface p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4 border-b border-hairline pb-4">
            <p className="font-fraunces text-xl text-ink">
              {editing ? "Edit item" : "Add an item"}
            </p>
            <DialogClose
              className="rounded-full p-1 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </div>

          {priceLocked && (
            <div className="mt-4">
              <CalloutBanner
                variant="gold"
                title="This item has contributions, so its price is locked"
                description={`${formatNaira(item?.contributed ?? 0)} has been given toward it. The name and note can still change.`}
              />
            </div>
          )}

          <label htmlFor="editor-name" className={cn(label, "mt-5 block")}>
            Item name
          </label>
          <input
            id="editor-name"
            value={form.name}
            maxLength={140}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              clearError("name");
            }}
            placeholder="A new study desk"
            className="mt-2 h-12 w-full rounded-md border border-hairline bg-surface px-4 text-[15px] text-ink outline-none focus:border-ink/40"
          />
          {errors.name && (
            <p className="mt-2 text-sm font-medium text-rust" role="alert">
              {errors.name}
            </p>
          )}

          <label htmlFor="editor-price" className={cn(label, "mt-5 block")}>
            Price (₦)
            {priceLocked && (
              <span className="ml-2 normal-case text-ink/40">
                locked at {formatNaira(item?.price ?? 0)}
              </span>
            )}
          </label>
          <input
            id="editor-price"
            type="number"
            inputMode="numeric"
            min={100}
            disabled={priceLocked}
            value={form.price}
            onChange={(e) => {
              setForm({ ...form, price: e.target.value });
              clearError("price");
            }}
            placeholder="80000"
            className="mt-2 h-12 w-full rounded-md border border-hairline bg-surface px-4 text-[15px] text-ink outline-none focus:border-ink/40 disabled:cursor-not-allowed disabled:bg-bone disabled:text-ink/50"
          />
          {errors.price && (
            <p className="mt-2 text-sm font-medium text-rust" role="alert">
              {errors.price}
            </p>
          )}

          <label htmlFor="editor-note" className={cn(label, "mt-5 block")}>
            Note <span className="normal-case text-ink/40">(optional)</span>
          </label>
          <textarea
            id="editor-note"
            value={form.note}
            maxLength={280}
            rows={2}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Say why you'd love it, or anything givers should know."
            className="mt-2 w-full rounded-md border border-hairline bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-ink/40"
          />
          {errors.note && (
            <p className="mt-2 text-sm font-medium text-rust" role="alert">
              {errors.note}
            </p>
          )}

          {serverError && (
            <p className="mt-4 text-sm font-medium text-rust" role="alert">
              {serverError}
            </p>
          )}

          <Button
            variant="ink"
            onClick={save}
            disabled={saving}
            className="mt-6 h-12 w-full rounded-xl text-[15px] font-semibold"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add item"}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </Dialog>
  );
}
