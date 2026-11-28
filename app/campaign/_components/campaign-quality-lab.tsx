"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Skeleton } from "@/components/ui/skeleton";
import { P, Small, Span } from "@/components/marketing/Typography";
import { getBaseURL } from "@/lib/utils";
import { causePublicPath } from "@/lib/causes/slug";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { goalPercent } from "@/lib/progress";
import type {
  CampaignQualityLabProps,
  TabKey,
} from "@/types/campaign-view-types";
import { stagger } from "@/lib/causes/campaign-constants";
import { useCampaignDonation } from "./hooks/use-campaign-donation";
import { HeroSummary } from "./ui/hero-summary";
import { DonateCard } from "./ui/donate-card";
import { TrustPanel } from "./ui/trust-panel";
import { ProgressCard } from "./ui/progress-card";
import { TabsCard } from "./ui/tabs-card";
import { CampaignHealthCard } from "./ui/campaign-health-card";
import { StorySections, CollapsibleStoryText } from "./ui/story-sections";

const MultimediaCarousel = dynamic(
  () => import("@/components/marketing/MultimediaCarousel"),
  {
    loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
  },
);

const ProofTimeline = dynamic(
  () =>
    import("@/components/causes/proof-timeline").then(
      (mod) => mod.ProofTimeline,
    ),
  {
    loading: () => <Skeleton className="h-40 w-full rounded-xl" />,
  },
);

export default function CampaignQualityLab({
  cause,
  donors,
  comments,
  profile,
  currentUserId,
  proofUpdates = [],
}: CampaignQualityLabProps) {
  const {
    donation,
    setDonation,
    tip,
    setTip,
    recurring,
    setRecurring,
    serviceFee,
    providerFee,
    totalWithTip,
  } = useCampaignDonation(0);

  const [activeTab, setActiveTab] = useState<TabKey>("Comments");
  const [isDonateVisible, setIsDonateVisible] = useState(false);
  const donateRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const donationElement = donateRef.current;
    if (!donationElement || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsDonateVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );

    observer.observe(donationElement);
    return () => observer.disconnect();
  }, []);

  const percentRaised = goalPercent(cause.raised, cause.goal);

  const media = useMemo(
    () => [...(cause.multimedia || []), ...(cause.video_links || [])],
    [cause.multimedia, cause.video_links],
  );

  const baseUrl = getBaseURL();
  const [shareUrl, setShareUrl] = useState(
    `${baseUrl}${causePublicPath(cause)}`,
  );

  useEffect(() => {
    if (typeof window !== "undefined") setShareUrl(window.location.href);
  }, []);

  const formattedDate = useMemo(
    () =>
      new Date(cause.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [cause.created_at],
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream text-ink">
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-24 pt-4 sm:gap-6 sm:px-6 sm:pb-28 sm:pt-6 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] lg:items-start lg:gap-8 lg:px-8">
        <motion.div
          className="order-1 lg:col-start-1 lg:row-start-1"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <HeroSummary cause={cause} donorsCount={donors.length} />
        </motion.div>
        <aside className="contents lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:block lg:self-start">
          <div className="contents lg:sticky lg:top-24 lg:block">
            <div className="order-4" ref={donateRef}>
              <DonateCard
                cause={cause}
                donation={donation}
                setDonation={setDonation}
                recurring={recurring}
                setRecurring={setRecurring}
                tip={tip}
                setTip={setTip}
                serviceFee={serviceFee}
                providerFee={providerFee}
                totalWithTip={totalWithTip}
                profile={profile}
              />
            </div>

            <div className="order-5 lg:mt-6">
              <CampaignHealthCard
                donors={donors}
                causeId={cause.id}
                causePath={causePublicPath(cause)}
                currentUserId={currentUserId}
                isFollowing={cause.isFollowing}
              />
            </div>
          </div>
        </aside>

        <div className="order-2 lg:col-start-1 lg:row-start-2">
          <section className="space-y-4 sm:space-y-6">
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0 },
              }}
            >
              {media.length > 0 || cause.image ? (
                <MultimediaCarousel
                  media={media}
                  coverImage={cause.image || undefined}
                  title={cause.title}
                />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-hairline bg-bone text-ink/50">
                  No media available
                </div>
              )}
            </motion.div>
            <ProgressCard
              cause={cause}
              percentRaised={percentRaised}
              shareUrl={shareUrl}
            />
          </section>
        </div>

        <div className="order-3 lg:col-start-1 lg:row-start-3">
          <section className="space-y-4 sm:space-y-6">
            <motion.div
              className="rounded-2xl border border-hairline bg-surface p-4 text-sm text-ink/80 sm:rounded-[20px] sm:p-7"
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <Eyebrow>The story</Eyebrow>

              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink/60">
                  <Link
                    href={`/${cause.user.username}`}
                    className="flex items-center gap-2 font-semibold text-ink hover:text-forest"
                  >
                    {cause.user.profile_photo ? (
                      <Image
                        src={
                          getMediaUrl(cause.user.profile_photo) ||
                          "/placeholder-user.jpg"
                        }
                        alt={cause.user.name}
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-full object-cover"
                        unoptimized={isProxyMediaUrl(
                          getMediaUrl(cause.user.profile_photo),
                        )}
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[9px] text-ink-foreground">
                        {cause.user.name.slice(0, 1)}
                      </span>
                    )}
                    {cause.user.name}
                  </Link>
                  <Span className="text-hairline">•</Span>
                  <Span className="capitalize text-ink/60">
                    {cause.category}
                  </Span>
                  <Span className="text-hairline">•</Span>
                  <Span className="text-ink/60">{formattedDate}</Span>
                </div>

                {cause.sections && cause.sections.length > 0 ? (
                  <StorySections sections={cause.sections} />
                ) : cause.description ? (
                  <CollapsibleStoryText text={cause.description} />
                ) : (
                  <P className="text-ink/60 md:text-sm">
                    No story yet. The campaign creator can add the full context
                    and plan here.
                  </P>
                )}
              </div>
            </motion.div>
          </section>
        </div>

        <div className="order-5 space-y-4 sm:space-y-6 lg:col-start-1 lg:row-start-4">
          <section className="space-y-4 sm:space-y-6">
            <TrustPanel baseUrl={baseUrl} cause={cause} />
            <ProofTimeline updates={proofUpdates} />
          </section>

          <section>
            <TabsCard
              cause={cause}
              formattedDate={formattedDate}
              comments={comments}
              currentUserId={currentUserId}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </section>
        </div>
      </main>

      {!isDonateVisible && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 px-4 py-3 shadow-elevated backdrop-blur-xl sm:hidden">
          <div className="mx-auto flex max-w-md items-center gap-4">
            <div className="min-w-0">
              <Small className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/60">
                Raised
              </Small>
              <P className="truncate font-fraunces font-medium text-ink md:text-base">
                ₦{cause.raised.toLocaleString()}
              </P>
            </div>
            <Button
              type="button"
              variant="ink"
              onClick={() =>
                donateRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className="h-11 flex-1 rounded-xl"
            >
              Donate now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
