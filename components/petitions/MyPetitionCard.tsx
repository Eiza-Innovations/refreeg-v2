import Link from "next/link";
import { BarChart3, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Small } from "@/components/marketing/Typography";
import { MyItemCard } from "@/components/dashboard/MyItemCard";
import { PetitionDropdown } from "@/components/causes/PetitionDropdown";
import { formatDate } from "@/lib/format-date";
import { optionLabel } from "@/lib/options/option-label";
import { myPetitionStatusOptions } from "@/lib/options/petition.options";
import { goalPercent } from "@/lib/progress";

type Props = {
  petition: {
    id: string;
    title: string;
    category: string | null;
    status: string;
    goal: number;
    signatures: number;
    created_at: Date | string;
    rejection_reason?: string | null;
  };
};

const statusVariant = {
  approved: "live",
  pending: "pending",
  rejected: "critical",
} as const;

/** One petition in the My petitions grid. */
export function MyPetitionCard({ petition }: Props) {
  const goal = Number(petition.goal) || 0;
  const status = (
    petition.status in statusVariant ? petition.status : "rejected"
  ) as keyof typeof statusVariant;

  return (
    <MyItemCard
      tone="parchment"
      status={{
        label: optionLabel(myPetitionStatusOptions, status),
        variant: statusVariant[status],
      }}
      eyebrow={petition.category}
      menu={<PetitionDropdown petitionId={petition.id} />}
      title={petition.title}
      href={`/petitions/${petition.id}`}
      value={petition.signatures.toLocaleString()}
      valueNote={`of ${goal.toLocaleString()} signatures`}
      percent={goalPercent(petition.signatures, goal)}
      meta={`Started ${formatDate(petition.created_at)}`}
      notice={
        status === "rejected" && petition.rejection_reason ? (
          <CalloutBanner
            variant="rust"
            title="Reviewer note"
            description={petition.rejection_reason}
          />
        ) : null
      }
      action={
        status === "approved" ? (
          <Button asChild variant="ink" className="h-10 w-full rounded-xl">
            <Link href={`/dashboard/petitions/${petition.id}/analytics`}>
              <BarChart3 className="mr-2 h-4 w-4" />
              View analytics
            </Link>
          </Button>
        ) : status === "pending" ? (
          <Small className="block text-center text-ink/60">
            Reviews usually take 3-5 business days. We will email you.
          </Small>
        ) : (
          <Button asChild variant="surface" className="h-10 w-full rounded-xl">
            <Link href={`/dashboard/petitions/${petition.id}/edit`}>
              <PencilLine className="mr-2 h-4 w-4" />
              Revise and resubmit
            </Link>
          </Button>
        )
      }
    />
  );
}
