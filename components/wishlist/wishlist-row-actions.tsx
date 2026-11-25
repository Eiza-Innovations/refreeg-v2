"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { setWishlistStatus } from "@/actions/wishlists/wishlist-actions";
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

/**
 * Archive/unarchive island for a dashboard wishlist card. Archiving with
 * money involved confirms first and states the amount (design rule 3).
 */
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

  return (
    <>
      {archived ? (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => changeStatus("active")}
          className="h-9 rounded-lg px-3 text-xs font-semibold text-slate-700"
        >
          {actionIcon}
          Unarchive
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          className="h-9 rounded-lg px-3 text-xs font-semibold text-slate-700"
        >
          {actionIcon}
          Archive
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-slate-950">
              Archive “{title}”?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-slate-600">
              It has {formatNaira(contributed)} given across its items. Your
              link keeps working and everything stays visible, but giving is
              paused until you unarchive it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 rounded-xl px-4 text-sm font-semibold">
              Keep it active
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => changeStatus("archived")}
              className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Archive wishlist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
