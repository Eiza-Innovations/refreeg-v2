"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gift, Plus, Trash2 } from "lucide-react";

import {
  addWishlistItem,
  createWishlist,
} from "@/actions/wishlists/wishlist-actions";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  WISHLIST_ITEM_CAP,
  wishlistCreateSchema,
  wishlistItemsSchema,
} from "@/lib/schemas/wishlist.schema";
import { slugifyWishlistTitle } from "@/lib/wishlist/slug";
import { useValidator } from "@/hooks/use-validator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const fieldLabel =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55";
const fieldInput =
  "h-12 w-full rounded-md border border-hairline bg-surface px-4 text-[15px] text-ink outline-none transition-colors focus:border-ink/40";

type ItemRow = { name: string; price: string; note: string };
type RowErrors = Record<number, Partial<Record<"name" | "price", string>>>;

const emptyRow = (): ItemRow => ({ name: "", price: "", note: "" });

const isRowBlank = (row: ItemRow) =>
  !row.name.trim() && !row.price.trim() && !row.note.trim();

export function CreateWishlistForm({
  seasonal,
  username,
}: {
  seasonal: boolean;
  username: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [wishlist, setWishlist] = useState({ title: "", message: "" });
  // The server keeps an 8-item cap per wishlist; the form lets the owner
  // fill all 8 slots during creation, or just one and the rest later.
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [rowErrors, setRowErrors] = useState<RowErrors>({});

  const wishlistValidator = useValidator({
    store: wishlist,
    schema: wishlistCreateSchema,
  });

  const slugPreview = wishlist.title.trim()
    ? slugifyWishlistTitle(wishlist.title)
    : null;

  const updateRow = (index: number, patch: Partial<ItemRow>) => {
    setItems((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
    setRowErrors((errors) => {
      if (!errors[index]) return errors;
      const next = { ...errors };
      delete next[index];
      return next;
    });
  };

  const goToItems = () => {
    setServerError(null);
    if (!wishlistValidator.validate()) return;
    setStep(2);
  };

  const validateRows = (rows: ItemRow[]): ItemRow[] | null => {
    const kept = rows.filter((row) => !isRowBlank(row));
    if (kept.length === 0) return null;

    const parsed = wishlistItemsSchema.safeParse(
      kept.map((row) => ({
        name: row.name,
        price: Number(row.price) || 0,
        note: row.note.trim() || undefined,
      })),
    );
    if (parsed.success) return kept;

    const errors: RowErrors = {};
    for (const issue of parsed.error.issues) {
      const rowIndex = issue.path[0] as number | undefined;
      const field = issue.path[1] as "name" | "price" | undefined;
      if (rowIndex === undefined || field === undefined) continue;
      if (!errors[rowIndex]) errors[rowIndex] = {};
      errors[rowIndex][field] = issue.message;
    }
    setRowErrors(errors);
    return null;
  };

  const create = async () => {
    setServerError(null);

    const rows = validateRows(items);
    if (!rows) {
      if (items.every(isRowBlank)) {
        setServerError("Add at least one item before creating your wishlist.");
      }
      return;
    }

    setSubmitting(true);
    try {
      const created = await createWishlist({
        title: wishlist.title,
        message: wishlist.message || undefined,
      });
      if (!created.success || !created.data) {
        setServerError(created.error || "Could not save the wishlist");
        setSubmitting(false);
        return;
      }

      let added = 0;
      let firstError: string | null = null;
      for (const row of rows) {
        const result = await addWishlistItem(created.data.id, {
          name: row.name,
          price: Number(row.price),
          note: row.note.trim() || undefined,
        });
        if (result.success) {
          added += 1;
        } else if (!firstError) {
          firstError = result.error || null;
        }
      }

      if (added === 0 && firstError) {
        // The wishlist exists; send the owner there to finish the list.
        toast({
          title: "Wishlist created",
          description: `${firstError} Add your items below.`,
        });
      } else if (firstError) {
        toast({
          title: "Wishlist created",
          description: `${added} of ${rows.length} items saved. ${firstError} Add the rest below.`,
        });
      }
      router.push(`/${username}/${created.data.slug}`);
    } catch {
      setServerError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Eyebrow className="text-forest">
        {step === 1 ? "Step 1 of 2 · Name it" : "Step 2 of 2 · Add gifts"}
      </Eyebrow>
      <h1 className="mt-3 font-fraunces text-3xl tracking-tight text-ink">
        {step === 1 ? "Name your wishlist" : "Add your gifts"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-ink/60">
        {step === 1
          ? "This is the title givers see at the top of your share page."
          : `Add up to ${WISHLIST_ITEM_CAP} items now, or start with one and add the rest any time later.`}
      </p>

      {step === 1 ? (
        <div className="mt-7">
          <label htmlFor="wishlist-title" className={fieldLabel}>
            Wishlist name
          </label>
          <input
            id="wishlist-title"
            value={wishlist.title}
            maxLength={120}
            onChange={(e) =>
              setWishlist({ ...wishlist, title: e.target.value })
            }
            placeholder={
              seasonal ? "Nomso's Christmas Wishlist" : "Nomso's Wishlist"
            }
            className={cn(fieldInput, "mt-2")}
          />
          {slugPreview && (
            <p className="mt-2 text-[13px] text-ink/50">
              Your link:{" "}
              <span className="font-medium text-ink/70">
                refreeg.com/{username}/{slugPreview}
              </span>
            </p>
          )}
          {wishlistValidator.errors.title && (
            <p className="mt-2 text-sm font-medium text-rust" role="alert">
              {wishlistValidator.errors.title}
            </p>
          )}

          <label
            htmlFor="wishlist-message"
            className={cn(fieldLabel, "mt-6 block")}
          >
            Note to visitors{" "}
            <span className="normal-case text-ink/40">(optional)</span>
          </label>
          <textarea
            id="wishlist-message"
            value={wishlist.message}
            maxLength={500}
            rows={3}
            onChange={(e) =>
              setWishlist({ ...wishlist, message: e.target.value })
            }
            placeholder="A line about the occasion, or how much their support means."
            className="mt-2 w-full rounded-md border border-hairline bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-ink/40"
          />
          {wishlistValidator.errors.message && (
            <p className="mt-2 text-sm font-medium text-rust" role="alert">
              {wishlistValidator.errors.message}
            </p>
          )}

          <Button
            variant="ink"
            onClick={goToItems}
            className="mt-7 h-14 w-full rounded-xl text-[15px] font-semibold"
          >
            Continue
          </Button>
        </div>
      ) : (
        <div className="mt-7">
          <div className="flex items-center gap-3 rounded-xl border border-hairline bg-bone px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-forest shadow-flat">
              <Gift className="h-4 w-4" />
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {wishlist.title}
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-[13px] font-semibold text-blue-accent hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>

          {items.map((row, index) => (
            <div
              key={index}
              className="mt-4 rounded-xl border border-hairline p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={fieldLabel}>Item {index + 1}</span>
                {items.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((rows) => rows.filter((_, i) => i !== index))
                    }
                    className="flex items-center gap-1 text-[13px] font-medium text-rust transition-colors hover:text-rust/80"
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                ) : null}
              </div>

              <label
                htmlFor={`item-name-${index}`}
                className={cn(fieldLabel, "mt-3 block")}
              >
                Item name
              </label>
              <input
                id={`item-name-${index}`}
                value={row.name}
                maxLength={140}
                aria-label={`Item name ${index + 1}`}
                onChange={(e) => updateRow(index, { name: e.target.value })}
                placeholder="A new study desk"
                className={cn(fieldInput, "mt-2")}
              />
              {rowErrors[index]?.name && (
                <p className="mt-2 text-sm font-medium text-rust" role="alert">
                  {rowErrors[index].name}
                </p>
              )}

              <label
                htmlFor={`item-price-${index}`}
                className={cn(fieldLabel, "mt-4 block")}
              >
                Price (₦)
              </label>
              <input
                id={`item-price-${index}`}
                type="number"
                inputMode="numeric"
                min={100}
                value={row.price}
                aria-label={`Price (₦) ${index + 1}`}
                onChange={(e) => updateRow(index, { price: e.target.value })}
                placeholder="80000"
                className={cn(fieldInput, "mt-2")}
              />
              {rowErrors[index]?.price && (
                <p className="mt-2 text-sm font-medium text-rust" role="alert">
                  {rowErrors[index].price}
                </p>
              )}

              <label
                htmlFor={`item-note-${index}`}
                className={cn(fieldLabel, "mt-4 block")}
              >
                Note about this item{" "}
                <span className="normal-case text-ink/40">(optional)</span>
              </label>
              <textarea
                id={`item-note-${index}`}
                value={row.note}
                maxLength={280}
                rows={2}
                onChange={(e) => updateRow(index, { note: e.target.value })}
                placeholder="Say why you'd love it, or anything givers should know."
                className="mt-2 w-full rounded-md border border-hairline bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-ink/40"
              />
            </div>
          ))}

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setItems((rows) => [...rows, emptyRow()])}
              disabled={items.length >= WISHLIST_ITEM_CAP}
              className={cn(
                "flex items-center gap-2 rounded-full border border-dashed border-ink/30 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/60 hover:bg-ink/5",
                items.length >= WISHLIST_ITEM_CAP &&
                  "cursor-not-allowed opacity-50 hover:border-ink/30 hover:bg-transparent",
              )}
            >
              <Plus className="h-4 w-4" />
              Add another item
            </button>
            <span className="text-[13px] text-ink/50">
              {items.length} of {WISHLIST_ITEM_CAP}
            </span>
          </div>

          {serverError && (
            <p className="mt-4 text-sm font-medium text-rust" role="alert">
              {serverError}
            </p>
          )}

          <Button
            variant="lime"
            onClick={create}
            disabled={submitting}
            className="mt-7 h-14 w-full rounded-xl text-[15px] font-semibold text-ink"
          >
            {submitting ? "Creating…" : "Create wishlist"}
          </Button>
        </div>
      )}
    </div>
  );
}
