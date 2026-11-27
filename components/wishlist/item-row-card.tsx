"use client";

import { Trash2 } from "lucide-react";

import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inputClass, labelClass } from "@/components/wishlist/form-classes";
import { ItemPhotoField } from "@/components/wishlist/item-photo-field";
import type { ItemRow, RowFieldErrors } from "@/lib/wishlist/item-rows";
import { cn } from "@/lib/utils";

export interface ItemRowCardProps {
  index: number;
  row: ItemRow;
  errors?: RowFieldErrors;
  removable: boolean;
  removeDisabled: boolean;
  onChange: (patch: Partial<ItemRow>) => void;
  onRemove: () => void;
  onPickImage: (file: File) => void;
  onRemoveImage: () => void;
}

export function ItemRowCard({
  index,
  row,
  errors,
  removable,
  removeDisabled,
  onChange,
  onRemove,
  onPickImage,
  onRemoveImage,
}: ItemRowCardProps) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className={labelClass}>Item {index + 1}</p>
        {removable ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={removeDisabled}
            className="flex items-center gap-1 text-xs font-semibold text-rust transition-colors hover:text-rust/80 disabled:opacity-50"
            aria-label={`Remove item ${index + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        ) : null}
      </div>

      <div className="mt-3 space-y-4">
        <ItemPhotoField
          index={index}
          imageUrl={row.imageUrl}
          uploading={row.uploading}
          onPick={onPickImage}
          onRemove={onRemoveImage}
        />

        <div className="space-y-2">
          <Label htmlFor={`item-name-${index}`} className={labelClass}>
            Item name <span className="text-rust">*</span>
          </Label>
          <Input
            id={`item-name-${index}`}
            value={row.name}
            maxLength={140}
            aria-label={`Item name ${index + 1}`}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="A new study desk"
            className={cn(inputClass, errors?.name && "border-rust")}
          />
          <FieldError message={errors?.name} />
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
            onChange={(e) => onChange({ price: e.target.value })}
            placeholder="80000"
            className={cn(inputClass, errors?.price && "border-rust")}
          />
          <FieldError message={errors?.price} />
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
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Say why you'd love it, or anything givers should know."
            className="premium-input sm:text-base"
          />
        </div>
      </div>
    </div>
  );
}
