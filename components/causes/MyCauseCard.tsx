import Link from "next/link";
import { BarChart3, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Small } from "@/components/marketing/Typography";
import { MyItemCard } from "@/components/dashboard/MyItemCard";
import { CauseDropdown } from "@/components/causes/CauseDropdown";
import { formatNaira } from "@/components/giving/format";
import { formatDate } from "@/lib/format-date";
import { myCauseStatusOptions } from "@/lib/options/cause.options";
import { optionLabel } from "@/lib/options/option-label";
import { goalPercent } from "@/lib/progress";
import type { Cause } from "@/types/cause-types";

type Props = {
  cause: Pick<
    Cause,
    | "id"
    | "slug"
    | "title"
    | "description"
    | "category"
    | "status"
    | "compliance_paused"
    | "goal"
    | "raised"
    | "created_at"
    | "updated_at"
    | "rejection_reason"
  >;
};

const statusVariant = {
  approved: "live",
  suspended: "held",
  pending: "pending",
  rejected: "critical",
} as const;

type StatusKey = keyof typeof statusVariant;

function statusKey(cause: Props["cause"]): StatusKey {
  if (cause.compliance_paused) return "suspended";
  return cause.status in statusVariant
    ? (cause.status as StatusKey)
    : "rejected";
}

function causeNotice(status: StatusKey, rejectionReason?: string | null) {
  if (status === "suspended") {
    return (
      <CalloutBanner
        variant="gold"
        title="Campaign suspended"
        description="Post the fund-use update shown above to bring it back."
      />
    );
  }
  if (status === "rejected" && rejectionReason) {
    return (
      <CalloutBanner
        variant="rust"
        title="Reviewer note"
        description={rejectionReason}
      />
    );
  }
  return null;
}

function causeAction(status: StatusKey, causeId: string) {
  if (status === "approved") {
    return (
      <Button asChild variant="ink" className="h-10 w-full rounded-xl">
        <Link href={`/dashboard/causes/${causeId}/analytics`}>
          <BarChart3 className="mr-2 h-4 w-4" />
          View analytics
        </Link>
      </Button>
    );
  }
  if (status === "pending") {
    return (
      <Small className="block text-center text-ink/60">
        Awaiting approval. We will email you.
      </Small>
    );
  }
  if (status === "rejected") {
    return (
      <Button asChild variant="surface" className="h-10 w-full rounded-xl">
        <Link href={`/dashboard/causes/${causeId}/edit`}>
          <PencilLine className="mr-2 h-4 w-4" />
          Revise and resubmit
        </Link>
      </Button>
    );
  }
  return null;
}

/** One campaign in the My campaigns grid. */
export function MyCauseCard({ cause }: Props) {
  const raised = Number(cause.raised) || 0;
  const goal = Number(cause.goal) || 0;
  const status = statusKey(cause);

  return (
    <MyItemCard
      tone="surface"
      status={{
        label: optionLabel(myCauseStatusOptions, status),
        variant: statusVariant[status],
      }}
      eyebrow={cause.category}
      menu={<CauseDropdown causeId={cause.id} causeSlug={cause.slug} />}
      title={cause.title}
      href={`/causes/${cause.slug || cause.id}`}
      description={cause.description}
      value={formatNaira(raised)}
      valueNote={`of ${formatNaira(goal)}`}
      percent={goalPercent(raised, goal)}
      meta={`Created ${formatDate(cause.created_at)} · Updated ${formatDate(cause.updated_at)}`}
      notice={causeNotice(status, cause.rejection_reason)}
      action={causeAction(status, cause.id)}
    />
  );
}
