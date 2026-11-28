import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Heading, P, Span } from "@/components/marketing/Typography";
import { getCampaignCategoryStyle } from "@/lib/causes/campaign-categories";
import { cn } from "@/lib/utils";
import type { CauseDetail } from "@/types/campaign-view-types";
import { fadeUp } from "@/lib/causes/campaign-constants";

export function HeroSummary({
  cause,
  donorsCount,
}: {
  cause: CauseDetail;
  donorsCount: number;
}) {
  const verified = cause.status === "approved";
  const categoryStyle = getCampaignCategoryStyle(cause.category);
  const CategoryIcon = categoryStyle.icon;

  return (
    <motion.div
      className="rounded-2xl border border-hairline bg-surface p-4 sm:rounded-[20px] sm:p-7"
      variants={fadeUp}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
        <Badge
          variant={verified ? "verified" : "pending"}
          className="gap-1.5 px-3 py-1"
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          {verified ? "Verified" : "In review"}
        </Badge>
        <Badge
          className={cn(
            "gap-1.5 border px-3 py-1",
            categoryStyle.badgeClassName,
          )}
        >
          <CategoryIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
          {categoryStyle.name} cause
        </Badge>
      </div>

      <div className="flex max-w-3xl flex-col gap-3 sm:gap-4">
        <Heading as="h1" size="subsection" className="font-medium">
          {cause.title}
        </Heading>
        <P className="max-w-2xl text-ink/70 sm:text-base">
          {cause.summary ||
            "Verified, milestone-based relief with evidence-locked releases and transparent updates."}
        </P>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-ink/70 sm:text-sm">
          {cause.location ? (
            <Span className="inline-flex items-center gap-1.5 text-ink/70">
              <MapPin className="h-4 w-4 text-forest" />
              {cause.location}
            </Span>
          ) : null}
          <Span className="inline-flex items-center gap-1.5 text-ink/70">
            <Users className="h-4 w-4 text-forest" />
            {donorsCount} supporters
          </Span>
        </div>
      </div>
    </motion.div>
  );
}
