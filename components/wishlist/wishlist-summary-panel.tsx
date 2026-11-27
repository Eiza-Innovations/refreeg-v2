import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatNaira } from "@/components/giving/format";
import type { WishlistWithItems } from "@/types";

/**
 * Money state lives on an ink panel (design guide rule 4). The numbers are
 * the same aggregates the bars show per item, so they are safe to render
 * for visitors as well as the owner.
 */
export function WishlistSummaryPanel({
  wishlist,
}: {
  wishlist: WishlistWithItems;
}) {
  const contributed = wishlist.items.reduce(
    (sum, item) => sum + item.contributed,
    0,
  );
  const funded = wishlist.items.filter((item) => item.funded_at).length;

  return (
    <Card variant="ink" className="rounded-2xl border-none p-5 sm:p-6">
      <Eyebrow className="text-white/60">Given so far</Eyebrow>
      <p className="mt-2 font-fraunces text-3xl font-medium text-white sm:text-4xl">
        {formatNaira(contributed)}
      </p>
      <p className="mt-2 text-[13px] text-white/60">
        {wishlist.items.length} {wishlist.items.length === 1 ? "item" : "items"}
        {funded > 0 &&
          ` · ${funded} ${funded === 1 ? "item" : "items"} fully funded`}
      </p>
    </Card>
  );
}
