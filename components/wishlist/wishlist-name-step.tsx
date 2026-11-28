"use client";

import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inputClass, labelClass } from "@/components/wishlist/form-classes";
import { slugifyWishlistTitle } from "@/lib/wishlist/slug";
import { cn } from "@/lib/utils";

export type WishlistDraft = { title: string; message: string };

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
    </div>
  );
}
