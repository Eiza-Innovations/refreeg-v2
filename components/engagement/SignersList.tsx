import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import type { Signature } from "@/types";

interface SignersListProps {
  signers: Signature[];
  petitionTitle: string;
  goal: number;
}

export function SignersList({
  signers,
  petitionTitle,
  goal,
}: SignersListProps) {
  const total = signers.reduce((sum, signer) => sum + (signer.amount || 0), 0);
  const percent =
    goal > 0 ? Math.min(Math.round((total / goal) * 100), 100) : 0;

  return (
    <Card variant="surface" className="p-6">
      <Eyebrow>Support so far</Eyebrow>
      <p className="mt-2 font-fraunces text-3xl text-ink">
        {total.toLocaleString()} {total === 1 ? "person has" : "people have"}{" "}
        signed
      </p>
      <p className="mt-1 text-sm text-ink/60">
        Help {petitionTitle} reach {goal.toLocaleString()} signatures.
      </p>
      <Progress
        value={percent}
        aria-label={`${percent}% of signature goal`}
        className="mt-4 h-1.5 bg-ink/10"
        indicatorVariant="forest"
      />
    </Card>
  );
}
