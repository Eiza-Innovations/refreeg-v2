"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatNaira } from "@/components/giving/format";
import { goalPercent } from "@/lib/progress";
import { causePublicPath } from "@/lib/causes/slug";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

interface ProfileCauseCardProps {
  cause: any;
}

export function ProfileCauseCard({ cause }: ProfileCauseCardProps) {
  const raised = Number(cause.raised) || 0;
  const goal = Number(cause.goal) || 0;
  const percent = goalPercent(raised, goal);
  const image = getMediaUrl(cause.image);

  return (
    <Card variant="surface" className="shadow-none">
      <CardContent className="p-0">
        <Link href={causePublicPath(cause)} className="group block">
          <div className="relative aspect-[2.15/1] w-full overflow-hidden rounded-t-2xl bg-bone">
            {image && (
              <Image
                src={image}
                alt={cause.title}
                fill
                sizes="(max-width: 640px) 100vw, 400px"
                className="object-cover"
                unoptimized={isProxyMediaUrl(image)}
              />
            )}
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="cyan"
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              >
                {cause.category || "Cause"}
              </Badge>
              {percent >= 100 && (
                <Badge
                  variant="forest"
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                >
                  Funded
                </Badge>
              )}
            </div>
            <p className="line-clamp-2 font-semibold text-ink group-hover:text-forest">
              {cause.title}
            </p>
            <Progress
              value={percent}
              indicatorVariant="forest"
              className="h-2 border border-hairline"
              aria-label={`${cause.title}, ${percent} percent funded`}
            />
            <p className="text-sm text-ink/70">
              {formatNaira(raised)}{" "}
              <span className="text-ink/45">
                of {formatNaira(goal)} · {percent}%
              </span>
            </p>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
