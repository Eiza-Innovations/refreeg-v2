import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { Heading, P } from "@/components/marketing/Typography";
import { ShareModal } from "@/components/engagement/ShareModal";
import { goalPercent } from "@/lib/progress";

type Props = {
  petitionId: string;
  title: string;
  url: string;
  signatures: number;
  goal: number;
  daysLeft: number | null;
};

/** Signature count, progress toward the goal and the share action. */
export function PetitionProgressCard({
  petitionId,
  title,
  url,
  signatures,
  goal,
  daysLeft,
}: Props) {
  const percent = goalPercent(signatures, goal);

  return (
    <Card variant="parchment" className="p-6">
      <Eyebrow>Signatures</Eyebrow>
      <Heading as="p" size="section" className="mt-2">
        {signatures.toLocaleString()}
      </Heading>
      <P className="mt-1 text-ink/60 md:text-sm">
        of {goal.toLocaleString()} needed
      </P>
      <Progress
        value={percent}
        aria-label={`${percent}% of signature goal`}
        className="mt-4 h-2 bg-ink/10"
        indicatorVariant="forest"
      />
      <dl className="mt-4 flex justify-between text-sm">
        <div>
          <dt className="text-ink/60">Reached</dt>
          <dd className="font-semibold text-ink">{percent}%</dd>
        </div>
        <div className="text-right">
          <dt className="text-ink/60">Days left</dt>
          <dd className="font-semibold text-ink">
            {daysLeft ?? "No end date"}
          </dd>
        </div>
      </dl>
      <div className="mt-5">
        <ShareModal
          url={url}
          title={title}
          entityId={petitionId}
          entityType="petition"
          triggerVariant="surface"
        />
      </div>
    </Card>
  );
}
