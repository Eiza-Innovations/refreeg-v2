"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatNaira } from "@/components/giving/format";
import { formatDate } from "@/components/profile/profile-display";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { wishlistPublicPath } from "@/lib/wishlist/slug";
import type { PublicWishlistSummary } from "@/types/wishlist-types";

interface ProfileWishlistCardProps {
  wishlist: PublicWishlistSummary;
  username: string;
}

export function ProfileWishlistCard({
  wishlist,
  username,
}: ProfileWishlistCardProps) {
  const percent =
    wishlist.target_total > 0
      ? Math.min(
          100,
          Math.round(
            (wishlist.contributed_total / wishlist.target_total) * 100,
          ),
        )
      : 0;
  const preview = wishlist.preview_images?.[0]
    ? getMediaUrl(wishlist.preview_images[0])
    : null;

  return (
    <Card variant="surface" className="shadow-none">
      <CardContent className="p-5">
        <Link
          href={wishlistPublicPath({
            ownerUsername: username,
            slug: wishlist.slug,
          })}
          className="group flex items-start gap-4"
        >
          {preview ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-hairline bg-bone">
              <Image
                src={preview}
                alt={wishlist.title}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized={isProxyMediaUrl(preview)}
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-hairline bg-bone">
              <Gift className="h-6 w-6 text-ink/30" aria-hidden />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="truncate text-base font-semibold text-ink group-hover:text-forest">
                {wishlist.title}
              </p>
              <Badge
                variant="forest"
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              >
                Active
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink/55">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(wishlist.created_at)}
            </p>
            <p className="mt-2 text-sm text-ink/70">
              {formatNaira(wishlist.contributed_total)}{" "}
              <span className="text-ink/45">
                of {formatNaira(wishlist.target_total)}
              </span>
            </p>
          </div>
        </Link>

        <Progress
          value={percent}
          indicatorVariant="forest"
          className="mt-3 h-2 border border-hairline"
          aria-label={`${wishlist.title}, ${percent} percent funded`}
        />
        <p className="mt-2 text-xs text-ink/55">
          {percent}% funded
          {wishlist.funded_count > 0 &&
            ` · ${wishlist.funded_count} ${
              wishlist.funded_count === 1 ? "item" : "items"
            } fully funded`}
        </p>
      </CardContent>
    </Card>
  );
}
