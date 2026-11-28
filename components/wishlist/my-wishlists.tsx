import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Gift,
  PackageOpen,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { listUserWishlists } from "@/actions/wishlists/wishlist-actions";
import { WishlistRowActions } from "@/components/wishlist/wishlist-row-actions";
import { formatNaira } from "@/components/giving/format";
import { formatDate } from "@/lib/format-date";

export async function MyWishlists() {
  const result = await listUserWishlists();
  const username = result.data?.username ?? null;
  const wishlists = result.data?.wishlists ?? [];

  if (wishlists.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-hairline bg-bone px-5 py-14 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-surface text-forest shadow-flat">
          <Gift className="h-6 w-6" />
        </span>
        <h3 className="mt-5 font-fraunces text-xl font-medium text-ink">
          No wishlists yet
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/70">
          Name the gifts you&apos;d actually love and share one link with family
          and friends. They give together, anonymously if they prefer.
        </p>
        <Link href="/dashboard/wishlists/create" className="inline-block">
          <Button variant="ink" className="mt-6 h-11 rounded-lg px-5">
            <Plus className="mr-2 h-4 w-4" />
            Create your first wishlist
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {wishlists.map((wishlist) => {
        const contributed = wishlist.items.reduce(
          (sum, item) => sum + item.contributed,
          0,
        );
        const target = wishlist.items.reduce(
          (sum, item) => sum + item.price,
          0,
        );
        const funded = wishlist.items.filter((item) => item.funded_at).length;
        const archived = wishlist.status === "archived";
        const percent =
          target > 0
            ? Math.min(100, Math.round((contributed / target) * 100))
            : 0;
        const shareHref = username
          ? `/${username}/${wishlist.slug}`
          : "/dashboard/wishlists";

        return (
          <Card key={wishlist.id} variant="surface" className="shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={shareHref}
                    className="block truncate text-base font-semibold text-ink hover:text-forest"
                  >
                    {wishlist.title}
                  </Link>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ink/55">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(wishlist.created_at)}
                  </p>
                </div>
                {archived ? (
                  <Badge variant="pending">ARCHIVED</Badge>
                ) : (
                  <Badge variant="forest">ACTIVE</Badge>
                )}
              </div>

              <p className="mt-4 text-sm text-ink/70">
                {formatNaira(contributed)}{" "}
                <span className="text-ink/45">
                  of {formatNaira(target)} across {wishlist.items.length}{" "}
                  {wishlist.items.length === 1 ? "item" : "items"}
                </span>
              </p>
              <Progress
                value={percent}
                indicatorVariant="forest"
                className="mt-2 h-2 border border-hairline"
                aria-label={`${wishlist.title}, ${percent} percent funded`}
              />
              {funded > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-forest">
                  <CircleCheck className="h-3.5 w-3.5" />
                  {funded} {funded === 1 ? "item" : "items"} fully funded
                </p>
              )}
              {wishlist.items.length === 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink/55">
                  <PackageOpen className="h-3.5 w-3.5" />
                  No items yet. Add what you&apos;d love.
                </p>
              )}

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-hairline pt-4">
                <Link
                  href={shareHref}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-accent hover:underline"
                >
                  Open
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <WishlistRowActions
                  wishlistId={wishlist.id}
                  title={wishlist.title}
                  contributed={contributed}
                  archived={archived}
                  actionIcon={
                    archived ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
