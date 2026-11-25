import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
          <p className="text-sm text-ink/60">Nothing in this period.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.label}
                className="grid grid-cols-[1fr_6rem_3rem] items-center gap-3 text-sm"
              >
                <span
                  className="truncate capitalize text-ink/70"
                  title={row.label}
                >
                  {row.label.replace(/_/g, " ")}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-cream-muted">
                  <span
                    className="block h-full rounded-full bg-blue-accent"
                    style={{ width: `${(row.value / total) * 100}%` }}
                  />
                </span>
                <span className="text-right font-semibold text-ink">
                  {row.value.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
