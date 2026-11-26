import { Heading, Small } from "@/components/marketing/Typography";

/** Title and helper line that open each wizard step. */
export function StepHeading({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-1">
      <Heading as="h2" size="panel">
        {title}
      </Heading>
      <Small className="block text-ink/60">{text}</Small>
    </div>
  );
}
