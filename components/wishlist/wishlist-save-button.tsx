"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleBookmark } from "@/actions/users/saved-actions";
import { toast } from "@/hooks/use-toast";
import { bumpSavedCount, setSavedCount } from "@/lib/saved/saved-count";
import { useAuthContext } from "@/components/layout/AuthProvider";

/**
 * Inline save/unsave control for wishlists — the card-overlay BookmarkButton
 * needs an image to sit on, the summary panel doesn't have one.
 */
export function WishlistSaveButton({
  wishlistId,
  initialSaved,
}: {
  wishlistId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const { isAuthenticated, isLoading } = useAuthContext();

  const handleToggle = async () => {
    if (pending) return;
    if (!isAuthenticated) {
      if (!isLoading) {
        toast({ title: "Sign in to save wishlists" });
      }
      return;
    }

    setPending(true);
    setSaved((current) => !current);
    bumpSavedCount(saved ? -1 : 1);
    try {
      const result = await toggleBookmark(wishlistId, "wishlist");
      setSaved(result.saved);
      setSavedCount(result.count);
      toast({
        title: result.saved ? "Added to saved" : "Removed from saved",
      });
    } catch {
      setSaved(initialSaved);
      bumpSavedCount(saved ? 1 : -1);
      toast({
        title: "Could not update saved wishlists",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={saved}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
        saved
          ? "border-ink bg-ink text-ink-foreground hover:bg-ink/90"
          : "border-ink/25 bg-surface text-ink hover:border-ink/50",
      )}
    >
      <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
      {saved ? "Saved" : "Save wishlist"}
    </button>
  );
}
