"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";

import {
  addWishlistItem,
  updateWishlistItem,
} from "@/actions/wishlists/wishlist-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDialogContent } from "@/components/ui/responsive-dialog-content";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { useValidator } from "@/hooks/use-validator";
import { toast } from "@/hooks/use-toast";
import { wishlistItemSchema } from "@/lib/schemas/wishlist.schema";
import { uploadFileWithPresign } from "@/lib/s3/upload-client";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { formatNaira } from "@/components/giving/format";
import type { WishlistItem } from "@/types";
import { cn } from "@/lib/utils";

const label =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export interface ItemEditorSheetProps {
  wishlistId: string;
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
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", price: "", note: "" });
  const [imageUrl, setImageUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    setForm({
      name: item?.name ?? "",
      price: item ? String(item.price) : "",
      note: item?.note ?? "",
    });
    setImageUrl(item?.image_url ?? "");
  }, [open, item]);

  const { errors, validate, clearError } = useValidator({
    store: { name: form.name, price: Number(form.price) || 0, note: form.note },
    schema: wishlistItemSchema,
  });

  const pickImage = () => fileInputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      toast({ title: "Use a JPG, PNG, WebP or GIF image" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: "Images stay under 10MB" });
      return;
    }
    setUploading(true);
    try {
      const { key } = await uploadFileWithPresign(file, {
        entityType: "wishlist-items",
        mediaType: "images",
        entityId: editing && item ? item.id : undefined,
      });
      setImageUrl(key);
    } catch (error) {
      toast({
        title:
          error instanceof Error
            ? error.message
            : "Upload failed. Please try again.",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
            imageUrl: imageUrl || null,
          })
        : await addWishlistItem(wishlistId, {
            name: form.name,
            price: Number(form.price),
            note: form.note || undefined,
            imageUrl: imageUrl || null,
          });
    setSaving(false);

    if (!result.success || !result.data) {
      setServerError(result.error || "Could not save the item");
      return;
    }
    onSaved(result.data);
    onOpenChange(false);
  };

  const preview = imageUrl ? getMediaUrl(imageUrl) : null;

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
                description={`${formatNaira(item?.contributed ?? 0)} has been given toward it. The name, photo and note can still change.`}
              />
            </div>
          )}

          <p className={cn(label, "mt-5 block")}>Photo</p>
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_MIME_TYPES.join(",")}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {preview ? (
            <div className="mt-2 flex items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-hairline bg-bone">
                <Image
                  src={preview}
                  alt="Item photo preview"
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized={isProxyMediaUrl(preview)}
                />
              </div>
              <button
                type="button"
                onClick={pickImage}
                disabled={uploading}
                className="text-sm font-semibold text-blue-accent hover:underline disabled:opacity-50"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => setImageUrl("")}
                disabled={uploading}
                className="text-sm font-semibold text-rust hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={pickImage}
              disabled={uploading}
              className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-hairline bg-bone px-4 py-3.5 text-left transition-colors hover:border-ink/30 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-ink/60" />
              ) : (
                <ImagePlus className="h-5 w-5 shrink-0 text-ink/60" />
              )}
              <span className="text-sm text-ink/70">
                {uploading ? "Uploading…" : "Add a photo (optional)"}
              </span>
            </button>
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
            disabled={saving || uploading}
            className="mt-6 h-12 w-full rounded-xl text-[15px] font-semibold"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add item"}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </Dialog>
  );
}
