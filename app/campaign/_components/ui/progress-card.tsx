import { motion } from "framer-motion";
import { CalendarClock } from "lucide-react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Heading, Small, Span } from "@/components/marketing/Typography";
import type { CauseDetail } from "@/types/campaign-view-types";
import { fadeUp } from "@/lib/causes/campaign-constants";

const ShareModal = dynamic(
  () =>
    import("@/components/engagement/ShareModal").then((mod) => mod.ShareModal),
  {
    loading: () => <Skeleton className="h-10 w-10 rounded-full" />,
  },
);

export function ProgressCard({
  cause,
  percentRaised,
  shareUrl,
}: {
  cause: CauseDetail;
  percentRaised: number;
  shareUrl: string;
}) {
  return (
    <motion.div
      className="rounded-2xl border border-hairline bg-surface p-4 sm:rounded-[20px] sm:p-7"
      variants={fadeUp}
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Eyebrow>Funding progress</Eyebrow>
        <div className="flex items-center gap-2">
          <Badge variant="forest">{percentRaised}% funded</Badge>
          <ShareModal
            url={shareUrl}
            title={cause.title}
            entityId={cause.id}
            entityType="cause"
            triggerVariant="surface"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mt-5">
        <Heading as="p" size="subsection" className="font-medium tabular-nums">
          ₦{cause.raised.toLocaleString()}
        </Heading>
        <Small className="text-ink/60">
          raised of ₦{cause.goal.toLocaleString()}
        </Small>
      </div>
      <Progress
        value={percentRaised}
        className="mt-4 h-2.5 bg-cream-muted sm:mt-5 [&>div]:bg-forest"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-ink/60">
        <Span className="text-xs text-ink/60">
          ₦{cause.raised.toLocaleString()} raised • {percentRaised}% funded
        </Span>
        <Badge variant="secondary" className="gap-1.5 font-semibold">
          <CalendarClock className="h-3.5 w-3.5 text-forest" />
          {cause.days_active} days left
        </Badge>
      </div>
    </motion.div>
  );
}
