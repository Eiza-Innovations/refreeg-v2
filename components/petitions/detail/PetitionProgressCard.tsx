import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
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
      <p className="mt-2 font-fraunces text-5xl text-ink">
        {signatures.toLocaleString()}
      </p>
      <p className="mt-1 text-sm text-ink/60">
        of {goal.toLocaleString()} needed
      </p>
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
