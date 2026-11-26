import Link from "next/link";
import { BarChart3, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Heading, Small } from "@/components/marketing/Typography";
import { PetitionDropdown } from "@/components/causes/PetitionDropdown";
import { formatDate } from "@/lib/format-date";
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
  const percent = goalPercent(petition.signatures, goal);
  const status =
    petition.status in statusVariant ? petition.status : "rejected";
  const statusLabel = myPetitionStatusOptions.find(
    (option) => option.value === status,
  )?.label;

  return (
    <Card variant="parchment" className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant[status as keyof typeof statusVariant]}>
            {statusLabel}
          </Badge>
          {petition.category && <Eyebrow>{petition.category}</Eyebrow>}
        </div>
        <PetitionDropdown petitionId={petition.id} />
      </div>

      <Heading as="h2" size="card" className="mt-4 line-clamp-3">
        <Link href={`/petitions/${petition.id}`} className="hover:underline">
          {petition.title}
        </Link>
      </Heading>

      <div className="mt-auto pt-6">
        <div className="flex items-end justify-between gap-3">
          <p className="font-fraunces text-3xl text-ink">
            {petition.signatures.toLocaleString()}
            <span className="ml-1.5 font-montserrat text-xs text-ink/60">
              of {goal.toLocaleString()} signatures
            </span>
          </p>
          <span className="text-sm font-semibold text-forest">{percent}%</span>
        </div>
        <Progress
          value={percent}
          aria-label={`${percent}% of signature goal`}
          className="mt-3 h-1.5 bg-ink/10"
          indicatorVariant="forest"
        />
        <Small className="mt-3 block text-ink/60">
          Started {formatDate(petition.created_at)}
        </Small>

        {petition.status === "rejected" && petition.rejection_reason && (
          <CalloutBanner
            variant="rust"
            title="Reviewer note"
            description={petition.rejection_reason}
            className="mt-4"
          />
        )}

        <div className="mt-5">
          {petition.status === "approved" && (
            <Button asChild variant="ink" className="h-10 w-full rounded-xl">
              <Link href={`/dashboard/petitions/${petition.id}/analytics`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                View analytics
              </Link>
            </Button>
          )}
          {petition.status === "pending" && (
            <Small className="block text-center text-ink/60">
              Reviews usually take 3-5 business days. We will email you.
            </Small>
          )}
          {petition.status === "rejected" && (
            <Button
              asChild
              variant="surface"
              className="h-10 w-full rounded-xl"
            >
              <Link href={`/dashboard/petitions/${petition.id}/edit`}>
                <PencilLine className="mr-2 h-4 w-4" />
                Revise and resubmit
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
