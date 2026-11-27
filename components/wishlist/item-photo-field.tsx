"use client";

import { useRef } from "react";
import Image from "next/image";
import { ImagePlus, Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { labelClass } from "@/components/wishlist/form-classes";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { WISHLIST_IMAGE_ACCEPT } from "@/lib/wishlist/item-image-upload";

export interface ItemPhotoFieldProps {
  index: number;
  imageUrl: string;
  uploading: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}

export function ItemPhotoField({
  index,
  imageUrl,
  uploading,
  onPick,
  onRemove,
}: ItemPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pick = () => inputRef.current?.click();
  const preview = imageUrl ? getMediaUrl(imageUrl) : null;

  return (
    <div className="space-y-2">
      <Label className={labelClass}>
        Photo <span className="font-normal text-ink/50">(optional)</span>
      </Label>
      <input
        ref={inputRef}
        type="file"
        accept={WISHLIST_IMAGE_ACCEPT}
        className="hidden"
        aria-label={`Item photo ${index + 1}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPick(file);
        }}
      />
      {preview ? (
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-hairline bg-bone">
            <Image
              src={preview}
              alt={`Item ${index + 1} photo preview`}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized={isProxyMediaUrl(preview)}
            />
          </div>
          <button
            type="button"
            onClick={pick}
            disabled={uploading}
            className="text-sm font-semibold text-blue-accent hover:underline disabled:opacity-50"
          >
            Change
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={uploading}
            className="text-sm font-semibold text-rust hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-hairline bg-bone px-4 py-3.5 text-left transition-colors hover:border-ink/30 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-ink/60" />
          ) : (
            <ImagePlus className="h-5 w-5 shrink-0 text-ink/60" />
          )}
          <span className="text-sm text-ink/70">
            {uploading ? "Uploading…" : "Add a photo"}
          </span>
        </button>
      )}
    </div>
  );
}
