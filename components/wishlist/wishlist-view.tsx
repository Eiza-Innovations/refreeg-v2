"use client";

import { useState } from "react";
import Link from "next/link";
import { Gift, Landmark } from "lucide-react";

import {
  deleteWishlistItem,
  reorderWishlistItems,
} from "@/actions/wishlists/wishlist-actions";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
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
import { ContributeSheet } from "@/components/wishlist/contribute-sheet";
import { ItemEditorSheet } from "@/components/wishlist/item-editor-sheet";
import { OwnerToolbar } from "@/components/wishlist/owner-toolbar";
import { ShareLinkRow } from "@/components/wishlist/share-link-row";
import { WishlistItemCard } from "@/components/wishlist/wishlist-item-card";
import { WishlistSummaryPanel } from "@/components/wishlist/wishlist-summary-panel";
import { toast } from "@/hooks/use-toast";
import { formatNaira } from "@/components/giving/format";
import type { Wishlist, WishlistItem, WishlistWithItems } from "@/types";

export interface WishlistViewProps {
  wishlist: WishlistWithItems;
  /** Owner's username; the share URL is /<ownerUsername>/<slug>. */
  ownerUsername: string;
  viewerIsOwner: boolean;
  /** Owner's bank details are on file, so gifts split straight to them. */
  ownerPayoutReady?: boolean;
  /** Signed-in giver prefill for the give sheet; null for guests. */
  viewer: { id: string; name: string; email: string } | null;
  seasonal: boolean;
  /** Server-rendered owner-only contributor list (delivery coordination). */
  givers?: React.ReactNode;
}

export function WishlistView({
  wishlist: initialWishlist,
  ownerUsername,
  viewerIsOwner,
  ownerPayoutReady = true,
  viewer,
  seasonal,
  givers,
}: WishlistViewProps) {
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [items, setItems] = useState<WishlistItem[]>(initialWishlist.items);
  const [giveItem, setGiveItem] = useState<WishlistItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorItem, setEditorItem] = useState<WishlistItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<WishlistItem | null>(null);

  const archived = wishlist.status === "archived";
  const totalContributed = items.reduce(
    (sum, item) => sum + item.contributed,
    0,
  );

  const patchMeta = (patch: Partial<Wishlist>) =>
    setWishlist((current) => ({ ...current, ...patch }));

  const handleMove = async (item: WishlistItem, direction: -1 | 1) => {
    const index = items.findIndex((entry) => entry.id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;

    const previous = items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);

    const result = await reorderWishlistItems(
      wishlist.id,
      next.map((entry) => entry.id),
    );
    if (!result.success) {
      setItems(previous);
      toast({ title: result.error || "Could not reorder the items" });
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    const result = await deleteWishlistItem(deleteItem.id);
    if (!result.success) {
      toast({ title: result.error || "Could not remove the item" });
      return;
    }
    setItems((current) =>
      current.filter((entry) => entry.id !== deleteItem.id),
    );
    toast({ title: "Item removed" });
    setDeleteItem(null);
  };

  const handleSaved = (saved: WishlistItem) => {
    setItems((current) => {
      const exists = current.some((entry) => entry.id === saved.id);
      return exists
        ? current.map((entry) => (entry.id === saved.id ? saved : entry))
        : [...current, saved];
    });
  };

  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <Eyebrow className="text-forest">
          {seasonal ? "The Refreeg holiday wishlist" : "A Refreeg wishlist"}
        </Eyebrow>
        <h1 className="mt-3 font-fraunces text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
          {wishlist.title}
        </h1>
        {wishlist.message && (
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-ink/60">
            {wishlist.message}
          </p>
        )}

        {archived && (
          <div className="mt-5">
            <CalloutBanner
              variant="neutral"
              title="This wishlist is archived"
              description="Everything stays visible, but giving is paused until the owner unarchives it."
            />
          </div>
        )}

        {/* Gold means waiting, not error: without bank details on file the
            gifts still collect, they just land on the platform account. */}
        {viewerIsOwner && !ownerPayoutReady && (
          <div className="mt-5">
            <CalloutBanner
              variant="gold"
              icon={<Landmark className="mt-0.5 h-5 w-5 shrink-0" />}
              title="Payout details aren't finished"
              description="Gifts still come through — they collect on RefreeG until you finish verification in Settings. After that, they split straight to your bank account."
              action={
                <Link
                  href="/dashboard/settings/kyc"
                  className="mt-0.5 shrink-0 text-sm font-semibold text-blue-accent hover:underline"
                >
                  Finish
                </Link>
              }
            />
          </div>
        )}

        {viewerIsOwner && (
          <div className="mt-6">
            <OwnerToolbar
              wishlist={wishlist}
              totalContributed={totalContributed}
              onUpdated={(updated) =>
                patchMeta({ title: updated.title, message: updated.message })
              }
              onStatusChange={(status) => patchMeta({ status })}
              onAddItem={() => {
                setEditorItem(null);
                setEditorOpen(true);
              }}
            />
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            {items.length === 0 ? (
              <EmptyState
                variant="page"
                className="py-10"
                icon={<Gift className="h-7 w-7" />}
                title="No gifts listed yet"
                description={
                  viewerIsOwner
                    ? "Add the things you'd actually love — each with its price — then share the link."
                    : "Check back soon; the wishlist owner is still picking gifts."
                }
                action={
                  viewerIsOwner && !archived ? (
                    <Button
                      variant="ink"
                      onClick={() => {
                        setEditorItem(null);
                        setEditorOpen(true);
                      }}
                      className="h-11 rounded-xl px-5 text-sm font-semibold"
                    >
                      Add your first item
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              items.map((item, index) => (
                <WishlistItemCard
                  key={item.id}
                  item={item}
                  isOwner={viewerIsOwner}
                  archived={archived}
                  index={index}
                  itemCount={items.length}
                  onGive={setGiveItem}
                  onEdit={(entry) => {
                    setEditorItem(entry);
                    setEditorOpen(true);
                  }}
                  onDelete={setDeleteItem}
                  onMove={handleMove}
                />
              ))
            )}
          </div>

          <aside className="space-y-6">
            <WishlistSummaryPanel wishlist={{ ...wishlist, items }} />
            <ShareLinkRow slug={wishlist.slug} ownerUsername={ownerUsername} />
            {viewerIsOwner && givers}
          </aside>
        </div>
      </div>

      {/* Mounted only with a chosen item: the sheet reads item fields on
          render, and an empty wishlist has nothing to give toward. */}
      {giveItem && (
        <ContributeSheet
          item={giveItem}
          wishlistTitle={wishlist.title}
          wishlistSlug={wishlist.slug}
          ownerUsername={ownerUsername}
          open
          onOpenChange={(open) => {
            if (!open) setGiveItem(null);
          }}
          viewer={viewer}
        />
      )}

      <ItemEditorSheet
        wishlistId={wishlist.id}
        item={editorItem}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={handleSaved}
      />

      <AlertDialog
        open={Boolean(deleteItem)}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-fraunces text-xl text-ink">
              Remove “{deleteItem?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-ink/60">
              {deleteItem && deleteItem.contributed > 0 ? (
                <>
                  {formatNaira(deleteItem.contributed)} has already been given
                  toward this item, so it can&apos;t be deleted — the money
                  ledger must keep resolving. You can still edit its name and
                  note.
                </>
              ) : (
                "This removes the item from the wishlist. This can't be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 rounded-lg px-4 text-sm font-semibold">
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(deleteItem && deleteItem.contributed > 0)}
              onClick={handleDelete}
              className="h-10 rounded-lg bg-rust px-4 text-sm font-semibold text-rust-foreground hover:bg-rust/90"
            >
              Remove item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
