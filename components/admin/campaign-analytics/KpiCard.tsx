import Link from "next/link";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Heading, Small } from "@/components/marketing/Typography";
import { signedPercent } from "@/lib/campaign-analytics/format";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  chip,
  chipVariant = "held",
  change,
  lowerIsBetter = false,
  href,
}: {
  label: string;
  value: string;
  chip?: string;
  chipVariant?: BadgeProps["variant"];
  /** Percent change vs last period; shown only when comparing. */
  change?: number | null;
  lowerIsBetter?: boolean;
  href?: string;
}) {
  const improved = change != null && (lowerIsBetter ? change < 0 : change > 0);
  const body = (
    <Card
      variant="surface"
      className={cn("h-full", href && "transition-shadow hover:shadow-card")}
    >
      <CardContent className="space-y-2 p-4">
        <Small className="block text-ink/60">{label}</Small>
        <div className="flex items-end justify-between gap-2">
          <Heading as="p" size="subsection" className="text-2xl md:text-2xl">
            {value}
          </Heading>
          {chip && <Badge variant={chipVariant}>{chip}</Badge>}
        </div>
        {change != null && (
          <Small
            className={cn(
              "block font-medium",
              improved ? "text-forest" : "text-rust",
            )}
          >
            {signedPercent(change)} vs last period
          </Small>
        )}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
