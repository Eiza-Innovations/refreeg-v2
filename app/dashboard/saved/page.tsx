import Link from "next/link";
import { Bookmark, Gift } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SavedGrid } from "@/components/saved/SavedGrid";
import { WishlistSaveButton } from "@/components/wishlist/wishlist-save-button";
import { toSavedItems, type SavedListSummary } from "@/lib/saved/saved";
import { wishlistSharePath } from "@/lib/wishlist/payout";

export default async function SavedPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <EmptyState
        variant="page"
        className="py-24"
        icon={<Bookmark className="h-7 w-7" />}
        title="Sign in to save campaigns"
        description="Your shortlist lives with your account, so it follows you across devices."
      />
    );
  }

  const [bookmarks, lists, alertPrefs] = await Promise.all([
    prisma.bookmark.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      select: { id: true, target_id: true, target_type: true, list_id: true },
    }),
    prisma.savedList.findMany({
      where: { user_id: userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.userAlertPrefs.findUnique({ where: { user_id: userId } }),
  ]);

  // target_id is polymorphic, so fetch each kind by id and join in code.
  const causeIds = bookmarks
    .filter((b) => b.target_type === "cause")
    .map((b) => b.target_id);
  const petitionIds = bookmarks
    .filter((b) => b.target_type === "petition")
    .map((b) => b.target_id);

  const [causes, petitions] = await Promise.all([
    prisma.cause.findMany({
      where: { id: { in: causeIds } },
      select: {
        id: true,
        title: true,
        image: true,
        goal: true,
        raised: true,
        status: true,
        end_date: true,
        paused: true,
        compliance_paused: true,
      },
    }),
    prisma.petitions.findMany({
      where: { id: { in: petitionIds } },
      select: { id: true, title: true, image: true, goal: true, raised: true },
    }),
  ]);

  const items = toSavedItems(bookmarks, causes, petitions);

  const wishlistIds = bookmarks
    .filter((b) => b.target_type === "wishlist")
    .map((b) => b.target_id);
  const savedWishlists =
    wishlistIds.length > 0
      ? await prisma.wishlists.findMany({
          where: { id: { in: wishlistIds } },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            user: { select: { username: true } },
          },
          orderBy: { created_at: "desc" },
        })
      : [];

  if (items.length === 0 && savedWishlists.length === 0) {
    return (
      <EmptyState
        variant="page"
        className="py-24"
        icon={<Bookmark className="h-7 w-7" />}
        title="A shortlist you can act on"
        description="Bookmark anything in Discover — and any wishlist you open — and it lands here. Group them into lists when there are more than a handful."
        action={
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button asChild variant="ink" className="rounded-xl">
              <Link href="/causes">Browse Discover</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/wishlist">Explore wishlists</Link>
            </Button>
          </div>
        }
      />
    );
  }

  const listSummaries: SavedListSummary[] = lists.map((l) => ({
    ...l,
    count: items.filter((i) => i.listId === l.id).length,
  }));

  return (
    <div className="min-h-screen bg-cream">
      <main className="mx-auto max-w-7xl p-6 lg:p-10">
        {savedWishlists.length > 0 ? (
          <section className="mb-10">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-ink/60" aria-hidden />
              <h2 className="text-lg font-semibold text-ink">
                Saved wishlists
              </h2>
              <span className="text-sm text-ink/50">
                {savedWishlists.length}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {savedWishlists.map((wishlist) => {
                const sharePath = wishlistSharePath(
                  wishlist.user.username,
                  wishlist.slug,
                );
                return (
                  <div
                    key={wishlist.id}
                    className="rounded-xl border border-hairline bg-surface p-4 shadow-subtle"
                  >
                    {sharePath ? (
                      <Link
                        href={sharePath}
                        className="block font-medium text-ink underline-offset-2 hover:underline"
                      >
                        {wishlist.title}
                      </Link>
                    ) : (
                      <span className="block font-medium text-ink">
                        {wishlist.title}
                      </span>
                    )}
                    <p className="mt-0.5 text-xs text-ink/50">
                      by @{wishlist.user.username}
                      {wishlist.status !== "active" ? " · archived" : ""}
                    </p>
                    <div className="mt-3">
                      <WishlistSaveButton
                        wishlistId={wishlist.id}
                        initialSaved
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
        {/*
         * The page header (count + closing/closed stats) now lives inside
         * SavedGrid, because those numbers must react to client-side removals.
         * Rendering them here would keep them frozen at the server-fetched
         * count until a full reload.
         */}
        <SavedGrid
          items={items}
          lists={listSummaries}
          alertPrefs={
            alertPrefs
              ? {
                  closing_3d: alertPrefs.closing_3d,
                  reached_80pct: alertPrefs.reached_80pct,
                  delivered: alertPrefs.delivered,
                  weekly_digest: alertPrefs.weekly_digest,
                }
              : undefined
          }
          user={{
            name: session.user.name ?? "",
            email: session.user.email ?? "",
          }}
        />
      </main>
    </div>
  );
}
