"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Plus, Trash2 } from "lucide-react";

import {
  addWishlistItem,
  createWishlist,
} from "@/actions/wishlists/wishlist-actions";
import { CauseWizard } from "@/app/dashboard/causes/_components/cause-wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";
import {
  WISHLIST_ITEM_CAP,
  wishlistCreateSchema,
  wishlistItemsSchema,
} from "@/lib/schemas/wishlist.schema";
import { slugifyWishlistTitle } from "@/lib/wishlist/slug";
import { useValidator } from "@/hooks/use-validator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ItemRow = { name: string; price: string; note: string };
type RowErrors = Record<number, Partial<Record<"name" | "price", string>>>;

const emptyRow = (): ItemRow => ({ name: "", price: "", note: "" });

const isRowBlank = (row: ItemRow) =>
  !row.name.trim() && !row.price.trim() && !row.note.trim();

const labelClass = "text-sm font-semibold text-ink sm:text-base";
const inputClass = "h-11 text-base premium-input sm:h-12 sm:text-lg";

const WISHLIST_STEPS = [
  {
    title: "Name your wishlist",
    description: "This is the title givers see at the top of your share page.",
  },
  {
    title: "Add your gifts",
    description: `Add up to ${WISHLIST_ITEM_CAP} items now, or start with one and add the rest any time later.`,
  },
] as const;

/**
 * The wishlist creation flow, hosted in the same wizard frame as cause
 * creation so every builder on RefreeG looks and behaves the same.
 */
export function CreateWishlistForm({
  seasonal,
  username,
}: {
  seasonal: boolean;
  username: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
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
    <CauseWizard
      eyebrow="Wishlist builder"
      title="Create your wishlist"
      description="Name it, list the gifts, and share one link."
      stepMeta={WISHLIST_STEPS}
      stepperLabels={["Name it", "Add gifts"]}
      headerBadge="Bank payout protected"
      currentStep={step}
      onStepSelect={(target) => {
        if (target < step) setStep(1);
      }}
      onBack={() => setStep(1)}
      onNext={goToItems}
      onSubmit={create}
      submitLabel="Create wishlist"
      busyLabel="Creating…"
      busy={submitting}
    >
      {step === 1 ? (
        <div className="space-y-5 sm:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="wishlist-title" className={labelClass}>
              Wishlist name <span className="text-rust">*</span>
            </Label>
            <Input
              id="wishlist-title"
              value={wishlist.title}
              maxLength={120}
              onChange={(e) =>
                setWishlist({ ...wishlist, title: e.target.value })
              }
              placeholder={
                seasonal ? "Nomso's Christmas Wishlist" : "Nomso's Wishlist"
              }
              className={cn(
                inputClass,
                wishlistValidator.errors.title && "border-rust",
              )}
            />
            {slugPreview && (
              <p className="text-xs text-ink/60">
                Your link:{" "}
                <span className="font-medium text-ink">
                  refreeg.com/{username}/{slugPreview}
                </span>
              </p>
            )}
            <FieldError message={wishlistValidator.errors.title} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wishlist-message" className={labelClass}>
              Note to visitors{" "}
              <span className="font-normal text-ink/50">(optional)</span>
            </Label>
            <Textarea
              id="wishlist-message"
              value={wishlist.message}
              maxLength={500}
              rows={3}
              onChange={(e) =>
                setWishlist({ ...wishlist, message: e.target.value })
              }
              placeholder="A line about the occasion, or how much their support means."
              className={cn(
                "premium-input sm:text-base",
                wishlistValidator.errors.message && "border-rust",
              )}
            />
            <FieldError message={wishlistValidator.errors.message} />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-lg border border-hairline bg-bone px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface text-forest shadow-flat">
              <Gift className="h-4 w-4" />
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {wishlist.title}
            </p>
          </div>

          {items.map((row, index) => (
            <div
              key={index}
              className="rounded-lg border border-hairline bg-surface p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className={labelClass}>Item {index + 1}</p>
                {items.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((rows) => rows.filter((_, i) => i !== index))
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-rust transition-colors hover:text-rust/80"
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="mt-3 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`item-name-${index}`} className={labelClass}>
                    Item name <span className="text-rust">*</span>
                  </Label>
                  <Input
                    id={`item-name-${index}`}
                    value={row.name}
                    maxLength={140}
                    aria-label={`Item name ${index + 1}`}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                    placeholder="A new study desk"
                    className={cn(
                      inputClass,
                      rowErrors[index]?.name && "border-rust",
                    )}
                  />
                  <FieldError message={rowErrors[index]?.name} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`item-price-${index}`} className={labelClass}>
                    Price (₦) <span className="text-rust">*</span>
                  </Label>
                  <Input
                    id={`item-price-${index}`}
                    type="number"
                    inputMode="numeric"
                    min={100}
                    value={row.price}
                    aria-label={`Price (₦) ${index + 1}`}
                    onChange={(e) =>
                      updateRow(index, { price: e.target.value })
                    }
                    placeholder="80000"
                    className={cn(
                      inputClass,
                      rowErrors[index]?.price && "border-rust",
                    )}
                  />
                  <FieldError message={rowErrors[index]?.price} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`item-note-${index}`} className={labelClass}>
                    Note about this item{" "}
                    <span className="font-normal text-ink/50">(optional)</span>
                  </Label>
                  <Textarea
                    id={`item-note-${index}`}
                    value={row.note}
                    maxLength={280}
                    rows={2}
                    onChange={(e) => updateRow(index, { note: e.target.value })}
                    placeholder="Say why you'd love it, or anything givers should know."
                    className="premium-input sm:text-base"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between gap-3">
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
            <span className="text-xs text-ink/60">
              {items.length} of {WISHLIST_ITEM_CAP}
            </span>
          </div>

          <FieldError message={serverError ?? undefined} />
        </div>
      )}
    </CauseWizard>
  );
}
