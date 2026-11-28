import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ChevronDown } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Skeleton } from "@/components/ui/skeleton";
import { P, Small, Span } from "@/components/marketing/Typography";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { causePublicPath } from "@/lib/causes/slug";
import { buildTrustTiles } from "@/lib/causes/trust-tiles";
import { fadeUp } from "@/lib/causes/campaign-constants";
import type { CauseDetail } from "@/types/campaign-view-types";

const ShareModal = dynamic(
  () =>
    import("@/components/engagement/ShareModal").then((mod) => mod.ShareModal),
  {
    loading: () => <Skeleton className="h-10 w-10 rounded-full" />,
  },
);

const ImageLightbox = dynamic(
  () =>
    import("@/components/marketing/ImageLightbox").then(
      (mod) => mod.ImageLightbox,
    ),
  {
    ssr: false,
  },
);

export function TrustPanel({
  cause,
  baseUrl,
}: {
  cause: CauseDetail;
  baseUrl?: string;
}) {
  const proofMedia = useMemo(() => {
    const allMedia =
      cause.multimedia && cause.multimedia.length > 0
        ? cause.multimedia
        : cause.image
          ? [cause.image]
          : [];
    return allMedia
      .filter((url) => {
        const isVideo =
          url.match(/\.(mp4|mov|webm)$/i) ||
          url.match(/(youtube\.com|youtu\.be|tiktok\.com|drive\.google\.com)/i);
        return !isVideo;
      })
      .reverse();
  }, [cause.image, cause.multimedia]);

  const [failedEvidence, setFailedEvidence] = useState<Set<string>>(
    () => new Set(),
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visibleProofMedia = useMemo(
    () => proofMedia.filter((item) => !failedEvidence.has(item)),
    [failedEvidence, proofMedia],
  );

  const tiles = buildTrustTiles(cause);

  return (
    <motion.div
      className="overflow-hidden rounded-2xl bg-ink text-ink-foreground sm:rounded-[20px]"
      variants={fadeUp}
    >
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:gap-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime text-lime-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <P className="font-semibold text-ink-foreground md:text-base">
                Verified and escrow protected
              </P>
              <Small className="mt-0.5 block truncate text-ink-foreground/60">
                View trust details and campaign evidence
              </Small>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 shrink-0 text-ink-foreground/60 transition-transform group-open:rotate-180" />
        </summary>

        <div className="border-t border-ink-foreground/10 px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
          <div className="flex justify-end">
            <ShareModal
              url={`${baseUrl}${causePublicPath(cause)}`}
              title={cause.title}
              entityId={cause.id}
              entityType="cause"
              triggerVariant="surface"
            />
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {tiles.map((tile) => (
              <div
                key={tile.title}
                className="rounded-2xl border border-ink-foreground/15 bg-ink-foreground/[0.055] p-4"
              >
                <div className="flex items-center justify-between">
                  <Eyebrow className="text-ink-foreground/60">
                    {tile.title}
                  </Eyebrow>
                  <Badge variant={tile.badgeVariant}>{tile.status}</Badge>
                </div>
                <P className="mt-2 text-ink-foreground/80 md:text-sm">
                  {tile.body}
                </P>
              </div>
            ))}
          </div>

          {visibleProofMedia.length > 0 && (
            <div className="mt-6 border-t border-ink-foreground/10 pt-5">
              <div className="flex items-center justify-between gap-3">
                <Eyebrow className="text-ink-foreground/60">
                  Campaign evidence
                </Eyebrow>
                <Small className="text-ink-foreground/50">
                  {visibleProofMedia.length}{" "}
                  {visibleProofMedia.length === 1 ? "image" : "images"}
                </Small>
              </div>
              <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
                {visibleProofMedia.map((item, index) => (
                  <button
                    key={`${item}-${index}`}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    aria-label="View evidence image full size"
                    className="group relative aspect-[4/3] w-[78%] shrink-0 snap-center overflow-hidden rounded-xl border border-ink-foreground/15 bg-ink sm:aspect-video sm:w-auto"
                  >
                    <Image
                      src={getMediaUrl(item) || "/icons/placeholder.svg"}
                      alt=""
                      fill
                      className="scale-110 object-cover opacity-35 blur-xl"
                      loading="lazy"
                      unoptimized={isProxyMediaUrl(getMediaUrl(item))}
                      aria-hidden="true"
                    />
                    <Image
                      src={getMediaUrl(item) || "/icons/placeholder.svg"}
                      alt=""
                      fill
                      className="object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                      loading="lazy"
                      unoptimized={isProxyMediaUrl(getMediaUrl(item))}
                      onError={() =>
                        setFailedEvidence((current) => {
                          const next = new Set(current);
                          next.add(item);
                          return next;
                        })
                      }
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/30 group-hover:opacity-100">
                      <Span className="rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-ink-foreground">
                        View full size
                      </Span>
                    </span>
                  </button>
                ))}
              </div>

              <ImageLightbox
                images={visibleProofMedia.map((item, mediaIndex) => ({
                  src: getMediaUrl(item) || "/icons/placeholder.svg",
                  alt: `${cause.title} evidence ${mediaIndex + 1}`,
                }))}
                currentIndex={lightboxIndex}
                onIndexChange={setLightboxIndex}
                onClose={() => setLightboxIndex(null)}
                label={`${cause.title} campaign evidence`}
              />
            </div>
          )}
        </div>
      </details>
    </motion.div>
  );
}
