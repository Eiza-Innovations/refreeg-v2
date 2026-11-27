import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { Heading, P } from "@/components/marketing/Typography";
import { goalPercent } from "@/lib/progress";
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
  const percent = goalPercent(total, goal);

  return (
    <Card variant="surface" className="p-6">
      <Eyebrow>Support so far</Eyebrow>
      <Heading as="p" size="block" className="mt-2">
        {total.toLocaleString()} {total === 1 ? "person has" : "people have"}{" "}
        signed
      </Heading>
      <P className="mt-1 text-ink/60 md:text-sm">
        Help {petitionTitle} reach {goal.toLocaleString()} signatures.
      </P>
      <Progress
        value={percent}
        aria-label={`${percent}% of signature goal`}
        className="mt-4 h-1.5 bg-ink/10"
        indicatorVariant="forest"
      />
    </Card>
  );
}
