import { ArrowDown, ArrowUp, PencilLine, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatNaira } from "@/components/giving/format";
import type { WishlistItem } from "@/types";
import { cn } from "@/lib/utils";

export interface WishlistItemCardProps {
  item: WishlistItem;
  isOwner: boolean;
  /** An archived wishlist renders read-only: bars stay, giving retires. */
  archived?: boolean;
  index: number;
  itemCount: number;
  onGive?: (item: WishlistItem) => void;
  onEdit?: (item: WishlistItem) => void;
  onDelete?: (item: WishlistItem) => void;
  onMove?: (item: WishlistItem, direction: -1 | 1) => void;
}

/** Collected over price, capped at 100 — races may overshoot the ledger. */
export const wishlistItemProgressPercent = (item: {
  contributed: number;
  price: number;
}): number => {
  if (item.price <= 0) return 0;
  return Math.min(100, Math.round((item.contributed / item.price) * 100));
};

const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-hairline bg-surface text-ink/60 transition-colors hover:border-ink/30 hover:text-ink disabled:pointer-events-none disabled:opacity-40";

export function WishlistItemCard({
  item,
  isOwner,
  archived = false,
  index,
  itemCount,
  onGive,
  onEdit,
  onDelete,
  onMove,
}: WishlistItemCardProps) {
  const funded = Boolean(item.funded_at);
  const percent = wishlistItemProgressPercent(item);

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-flat">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-snug text-ink">{item.name}</p>
          {item.note && (
            <p className="mt-1 text-[13px] leading-5 text-ink/55">
              {item.note}
            </p>
          )}
        </div>
        <p className="shrink-0 text-sm font-semibold text-ink">
          {formatNaira(item.price)}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Progress
          value={percent}
          indicatorVariant={funded ? "lime" : "forest"}
          className="h-2.5"
          aria-label={`${item.name}, ${percent} percent funded`}
        />
        {funded && (
          <Badge variant="cleared" className="shrink-0">
            FULLY FUNDED
          </Badge>
        )}
      </div>
      <p className="mt-2 text-[13px] text-ink/55">
        {formatNaira(item.contributed)} contributed
        {!funded && item.contributed < item.price && (
          <> · {formatNaira(item.price - item.contributed)} to go</>
        )}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex-1">
          {!funded && !archived && onGive && (
            <Button
              variant="ink"
              onClick={() => onGive(item)}
              className="h-11 w-full rounded-xl text-sm font-semibold sm:w-auto sm:px-8"
            >
              Give to this gift
            </Button>
          )}
          {archived && (
            <p className="text-[13px] text-ink/50">
              {funded
                ? "Funded before this wishlist was archived."
                : "This wishlist is archived, so giving is paused."}
            </p>
          )}
        </div>

        {isOwner && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              aria-label={`Move ${item.name} up`}
              disabled={index === 0}
              onClick={() => onMove?.(item, -1)}
              className={iconButton}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Move ${item.name} down`}
              disabled={index === itemCount - 1}
              onClick={() => onMove?.(item, 1)}
              className={iconButton}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Edit ${item.name}`}
              onClick={() => onEdit?.(item)}
              className={iconButton}
            >
              <PencilLine className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Remove ${item.name}`}
              onClick={() => onDelete?.(item)}
              className={cn(iconButton, "hover:border-rust/40 hover:text-rust")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
