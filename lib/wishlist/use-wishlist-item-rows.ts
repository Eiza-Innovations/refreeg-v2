"use client";

import { useState } from "react";

import { toast } from "@/hooks/use-toast";
import {
  WISHLIST_ITEM_CAP,
  wishlistItemsSchema,
} from "@/lib/schemas/wishlist.schema";
import { uploadWishlistItemImage } from "@/lib/wishlist/item-image-upload";
import {
  emptyRow,
  isRowBlank,
  rowErrorsFromIssues,
  toItemInput,
  type ItemRow,
  type RowErrors,
} from "@/lib/wishlist/item-rows";

/**
 * Item rows for the create-wishlist flow: edit, add and remove rows, upload a
 * photo per row, and validate the filled ones before saving.
 */
export function useWishlistItemRows() {
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [errors, setErrors] = useState<RowErrors>({});

  const updateRow = (index: number, patch: Partial<ItemRow>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
    setErrors((current) => {
      if (!current[index]) return current;
      const next = { ...current };
      delete next[index];
      return next;
    });
  };

  const addRow = () =>
    setRows((current) =>
      current.length >= WISHLIST_ITEM_CAP ? current : [...current, emptyRow()],
    );

  const removeRow = (index: number) =>
    setRows((current) => current.filter((_, i) => i !== index));

  const uploadImage = async (index: number, file: File) => {
    updateRow(index, { uploading: true });
    const result = await uploadWishlistItemImage(file);
    if (!result.success) {
      updateRow(index, { uploading: false });
      toast({ title: result.error });
      return;
    }
    updateRow(index, { imageUrl: result.key, uploading: false });
  };

  const removeImage = (index: number) => updateRow(index, { imageUrl: "" });

  /** The filled rows when valid, otherwise null with errors set on the rows. */
  const validate = (): ItemRow[] | null => {
    const rowIndexes = rows.flatMap((row, i) => (isRowBlank(row) ? [] : [i]));
    if (rowIndexes.length === 0) return null;

    const kept = rowIndexes.map((i) => rows[i]);
    const parsed = wishlistItemsSchema.safeParse(kept.map(toItemInput));
    if (parsed.success) return kept;

    setErrors(rowErrorsFromIssues(parsed.error.issues, rowIndexes));
    return null;
  };

  return {
    rows,
    errors,
    isEmpty: rows.every(isRowBlank),
    uploading: rows.some((row) => row.uploading),
    updateRow,
    addRow,
    removeRow,
    uploadImage,
    removeImage,
    validate,
  };
}

export type WishlistItemRows = ReturnType<typeof useWishlistItemRows>;
