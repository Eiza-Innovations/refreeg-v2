"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import {
  deleteWishlist,
  setWishlistStatus,
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
import { formatNaira } from "@/components/giving/format";
import { toast } from "@/hooks/use-toast";

export function WishlistRowActions({
  wishlistId,
  title,
  contributed,
  archived,
  actionIcon,
}: {
  wishlistId: string;
  title: string;
  contributed: number;
  archived: boolean;
  actionIcon: React.ReactNode;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const changeStatus = async (status: "active" | "archived") => {
    setBusy(true);
    const result = await setWishlistStatus(wishlistId, status);
    setBusy(false);
    setConfirmOpen(false);
    if (!result.success) {
      toast({ title: result.error || "Could not update the wishlist" });
      return;
    }
    toast({
      title: status === "archived" ? "Wishlist archived" : "Wishlist active",
      description:
        status === "archived"
          ? "Its link still works; giving is paused."
          : "Giving is open again.",
    });
    router.refresh();
  };

  const remove = async () => {
    setBusy(true);
    const result = await deleteWishlist(wishlistId);
    setBusy(false);
    setDeleteOpen(false);
    if (!result.success) {
      toast({ title: result.error || "Could not delete the wishlist" });
      return;
    }
    toast({
      title: "Wishlist deleted",
      description: `“${title}” is gone for good.`,
    });
    router.refresh();
  };

  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        {archived ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => changeStatus("active")}
            className="h-9 rounded-lg px-3 text-xs font-semibold"
          >
            {actionIcon}
            Unarchive
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            className="h-9 rounded-lg px-3 text-xs font-semibold"
          >
            {actionIcon}
            Archive
          </Button>
        )}
        {contributed === 0 && (
          <Button
            variant="ghost"
            aria-label={`Delete ${title}`}
            onClick={() => setDeleteOpen(true)}
            className="h-9 rounded-lg px-2.5 text-xs font-semibold text-rust hover:bg-rust/10 hover:text-rust"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </span>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-3xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-ink">
              Archive “{title}”?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-ink/70">
              It has {formatNaira(contributed)} given across its items. Your
              link keeps working and everything stays visible, but giving is
              paused until you unarchive it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 rounded-lg px-4 text-sm font-semibold">
              Keep it active
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => changeStatus("archived")}
              className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-cream hover:bg-ink/90"
            >
              Archive wishlist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-3xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-ink">
              Delete “{title}”?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-ink/70">
              This removes the wishlist and every item on it for good, and it
              cannot be undone. A wishlist that already has gifts on it cannot
              be deleted; archive that one instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 rounded-lg px-4 text-sm font-semibold">
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => remove()}
              className="h-10 rounded-lg bg-rust px-4 text-sm font-semibold text-white hover:bg-rust/90"
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
