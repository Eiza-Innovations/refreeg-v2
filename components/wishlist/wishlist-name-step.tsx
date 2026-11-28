"use client";

import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inputClass, labelClass } from "@/components/wishlist/form-classes";
import { slugifyWishlistTitle } from "@/lib/wishlist/slug";
import { cn } from "@/lib/utils";

export type WishlistDraft = {
  title: string;
  message: string;
  isPublic: boolean;
};

export function WishlistNameStep({
  wishlist,
  errors,
  seasonal,
  username,
  onChange,
}: {
  wishlist: WishlistDraft;
  errors: Partial<Record<keyof WishlistDraft, string>>;
  seasonal: boolean;
  username: string;
  onChange: (patch: Partial<WishlistDraft>) => void;
}) {
  const slugPreview = wishlist.title.trim()
    ? slugifyWishlistTitle(wishlist.title)
    : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-2">
        <Label htmlFor="wishlist-title" className={labelClass}>
          Wishlist name <span className="text-rust">*</span>
        </Label>
        <Input
          id="wishlist-title"
          value={wishlist.title}
          maxLength={120}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={
            seasonal ? "Nomso's Christmas Wishlist" : "Nomso's Wishlist"
          }
          className={cn(inputClass, errors.title && "border-rust")}
        />
        {slugPreview && (
          <p className="text-xs text-ink/60">
            Your link:{" "}
            <span className="font-medium text-ink">
              refreeg.com/{username}/{slugPreview}
            </span>
          </p>
        )}
        <FieldError message={errors.title} />
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
          onChange={(e) => onChange({ message: e.target.value })}
          placeholder="A line about the occasion, or how much their support means."
          className={cn(
            "premium-input sm:text-base",
            errors.message && "border-rust",
          )}
        />
        <FieldError message={errors.message} />
      </div>

      <fieldset className="rounded-xl border border-hairline bg-surface p-4">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55">
          Who can find this wishlist?
        </legend>
        <div className="mt-1 space-y-2.5">
          <label className="flex cursor-pointer items-start gap-3">
            {/* Native input: Radix Checkbox loops on its ref under React 19 here. */}
            <input
              type="radio"
              name="wishlist-visibility"
              checked={wishlist.isPublic}
              onChange={() => onChange({ isPublic: true })}
              className="mt-1 h-4 w-4 shrink-0 accent-ink"
            />
            <span className="text-sm leading-6">
              <span className="font-medium text-ink">Public</span>
              <span className="text-ink/60">
                {" "}
                : listed on /wishlist and your profile, so anyone can find it.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="wishlist-visibility"
              checked={!wishlist.isPublic}
              onChange={() => onChange({ isPublic: false })}
              className="mt-1 h-4 w-4 shrink-0 accent-ink"
            />
            <span className="text-sm leading-6">
              <span className="font-medium text-ink">Private</span>
              <span className="text-ink/60">
                {" "}
                : only people with the link (and you) can open it.
              </span>
            </span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}
