"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gift } from "lucide-react";

import {
  addWishlistItem,
  createWishlist,
} from "@/actions/wishlists/wishlist-actions";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  wishlistCreateSchema,
  wishlistItemSchema,
} from "@/lib/schemas/wishlist.schema";
import { slugifyWishlistTitle } from "@/lib/wishlist/slug";
import { useValidator } from "@/hooks/use-validator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const fieldLabel =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55";
const fieldInput =
  "h-12 w-full rounded-md border border-hairline bg-surface px-4 text-[15px] text-ink outline-none transition-colors focus:border-ink/40";

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
  const [item, setItem] = useState({ name: "", price: "", note: "" });

  const wishlistValidator = useValidator({
    store: wishlist,
    schema: wishlistCreateSchema,
  });
  const itemValidator = useValidator({
    store: { ...item, price: Number(item.price) || 0 },
    schema: wishlistItemSchema,
  });

  const slugPreview = wishlist.title.trim()
    ? slugifyWishlistTitle(wishlist.title)
    : null;

  const goToItems = () => {
    setServerError(null);
    if (!wishlistValidator.validate()) return;
    setStep(2);
  };

  const create = async () => {
    setServerError(null);
    if (!itemValidator.validate()) return;

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

      const added = await addWishlistItem(created.data.id, {
        name: item.name,
        price: Number(item.price),
        note: item.note || undefined,
      });
      if (!added.success) {
        // The wishlist exists; send the owner there to finish the list.
        toast({
          title: "Wishlist created",
          description:
            added.error || "Your first item could not be saved. Add it below.",
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
        {step === 1 ? "Step 1 of 2 · Name it" : "Step 2 of 2 · First gift"}
      </Eyebrow>
      <h1 className="mt-3 font-fraunces text-3xl tracking-tight text-ink">
        {step === 1 ? "Name your wishlist" : "Add your first item"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-ink/60">
        {step === 1
          ? "This is the title givers see at the top of your share page."
          : "You can add up to eight items now or any time later, so start with one."}
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

          <label htmlFor="item-name" className={cn(fieldLabel, "mt-6 block")}>
            Item name
          </label>
          <input
            id="item-name"
            value={item.name}
            maxLength={140}
            onChange={(e) => setItem({ ...item, name: e.target.value })}
            placeholder="A new study desk"
            className={cn(fieldInput, "mt-2")}
          />
          {itemValidator.errors.name && (
            <p className="mt-2 text-sm font-medium text-rust" role="alert">
              {itemValidator.errors.name}
            </p>
          )}

          <label htmlFor="item-price" className={cn(fieldLabel, "mt-6 block")}>
            Price (₦)
          </label>
          <input
            id="item-price"
            type="number"
            inputMode="numeric"
            min={100}
            value={item.price}
            onChange={(e) => setItem({ ...item, price: e.target.value })}
            placeholder="80000"
            className={cn(fieldInput, "mt-2")}
          />
          {itemValidator.errors.price && (
            <p className="mt-2 text-sm font-medium text-rust" role="alert">
              {itemValidator.errors.price}
            </p>
          )}

          <label htmlFor="item-note" className={cn(fieldLabel, "mt-6 block")}>
            Note about this item{" "}
            <span className="normal-case text-ink/40">(optional)</span>
          </label>
          <textarea
            id="item-note"
            value={item.note}
            maxLength={280}
            rows={2}
            onChange={(e) => setItem({ ...item, note: e.target.value })}
            placeholder="Say why you'd love it, or anything givers should know."
            className="mt-2 w-full rounded-md border border-hairline bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-ink/40"
          />
          {itemValidator.errors.note && (
            <p className="mt-2 text-sm font-medium text-rust" role="alert">
              {itemValidator.errors.note}
            </p>
          )}

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
