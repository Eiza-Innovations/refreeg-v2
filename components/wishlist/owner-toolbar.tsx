"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, PencilLine, Plus } from "lucide-react";

import {
  setWishlistStatus,
  updateWishlist,
} from "@/actions/wishlists/wishlist-actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDialogContent } from "@/components/ui/responsive-dialog-content";
import { wishlistCreateSchema } from "@/lib/schemas/wishlist.schema";
import { useValidator } from "@/hooks/use-validator";
import { toast } from "@/hooks/use-toast";
import { formatNaira } from "@/components/giving/format";
import type { Wishlist } from "@/types";

const fieldInput =
  "h-12 w-full rounded-md border border-hairline bg-surface px-4 text-[15px] text-ink outline-none transition-colors focus:border-ink/40";

export function OwnerToolbar({
  wishlist,
  totalContributed,
  onUpdated,
  onStatusChange,
  onAddItem,
}: {
  wishlist: Wishlist;
  totalContributed: number;
  onUpdated: (wishlist: Wishlist) => void;
  onStatusChange: (status: "active" | "archived") => void;
  onAddItem: () => void;
}) {
  const archived = wishlist.status === "archived";
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState({
    title: wishlist.title,
    message: wishlist.message ?? "",
  });
  const validator = useValidator({
    store: details,
    schema: wishlistCreateSchema,
  });

  const saveDetails = async () => {
    if (!validator.validate()) return;
    setSaving(true);
    const result = await updateWishlist(wishlist.id, {
      title: details.title,
      message: details.message || undefined,
    });
    setSaving(false);
    if (!result.success || !result.data) {
      toast({ title: result.error || "Could not save changes" });
      return;
    }
    onUpdated(result.data);
    setDetailsOpen(false);
  };

  const changeStatus = async (status: "active" | "archived") => {
    setSaving(true);
    const result = await setWishlistStatus(wishlist.id, status);
    setSaving(false);
    if (!result.success) {
      toast({ title: result.error || "Could not update the wishlist" });
      return;
    }
    onStatusChange(status);
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {!archived && (
        <Button
          variant="ink"
          onClick={onAddItem}
          className="h-10 rounded-lg px-4 text-sm font-semibold"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add an item
        </Button>
      )}
      <Button
        variant="subtle"
        onClick={() => {
          setDetails({
            title: wishlist.title,
            message: wishlist.message ?? "",
          });
          setDetailsOpen(true);
        }}
        className="h-10 rounded-lg px-4 text-sm font-semibold"
      >
        <PencilLine className="mr-1.5 h-4 w-4" />
        Edit details
      </Button>
      {archived ? (
        <Button
          variant="subtle"
          disabled={saving}
          onClick={() => changeStatus("active")}
          className="h-10 rounded-lg px-4 text-sm font-semibold"
        >
          <ArchiveRestore className="mr-1.5 h-4 w-4" />
          Unarchive
        </Button>
      ) : (
        <Button
          variant="subtle"
          onClick={() => setArchiveOpen(true)}
          className="h-10 rounded-lg px-4 text-sm font-semibold"
        >
          <Archive className="mr-1.5 h-4 w-4" />
          Archive
        </Button>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogTitle className="font-fraunces text-xl text-ink">
            Edit details
          </DialogTitle>
          <label
            htmlFor="toolbar-title"
            className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55"
          >
            Wishlist name
          </label>
          <input
            id="toolbar-title"
            value={details.title}
            maxLength={120}
            onChange={(e) => setDetails({ ...details, title: e.target.value })}
            className={`${fieldInput} mt-2`}
          />
          {validator.errors.title && (
            <p className="mt-1.5 text-sm font-medium text-rust" role="alert">
              {validator.errors.title}
            </p>
          )}
          <label
            htmlFor="toolbar-message"
            className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55"
          >
            Note to visitors (optional)
          </label>
          <textarea
            id="toolbar-message"
            value={details.message}
            maxLength={500}
            rows={3}
            onChange={(e) =>
              setDetails({ ...details, message: e.target.value })
            }
            className="mt-2 w-full rounded-md border border-hairline bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-ink/40"
          />
          {validator.errors.message && (
            <p className="mt-1.5 text-sm font-medium text-rust" role="alert">
              {validator.errors.message}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2.5">
            <Button
              variant="surface"
              onClick={() => setDetailsOpen(false)}
              className="h-10 rounded-lg px-4 text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="ink"
              disabled={saving}
              onClick={saveDetails}
              className="h-10 rounded-lg px-5 text-sm font-semibold"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent className="rounded-3xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-fraunces text-xl text-ink">
              Archive this wishlist?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-ink/60">
              It has {formatNaira(totalContributed)} given across its items.
              Your link keeps working and everything stays visible, but giving
              is paused until you unarchive it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 rounded-lg px-4 text-sm font-semibold">
              Keep it active
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={() => changeStatus("archived")}
              className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-ink-foreground hover:bg-ink/90"
            >
              Archive wishlist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
