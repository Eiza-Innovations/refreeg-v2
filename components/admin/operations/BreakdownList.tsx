import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { P, Span } from "@/components/marketing/Typography";

export function BreakdownList({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <Card variant="surface">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <P className="text-ink/60 md:text-sm">Nothing in this period.</P>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.label}
                className="grid grid-cols-[1fr_6rem_3rem] items-center gap-3 text-sm"
              >
                <Span
                  className="truncate capitalize text-ink/70"
                  title={row.label}
                >
                  {row.label.replace(/_/g, " ")}
                </Span>
                <span className="h-2 overflow-hidden rounded-full bg-cream-muted">
                  <span
                    className="block h-full rounded-full bg-blue-accent"
                    style={{ width: `${(row.value / total) * 100}%` }}
                  />
                </span>
                <Span className="text-right font-semibold text-ink">
                  {row.value.toLocaleString()}
                </Span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
