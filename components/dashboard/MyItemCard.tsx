import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { Heading, Small } from "@/components/marketing/Typography";

type Props = {
  /** Petitions use the parchment surface; campaigns use the plain one. */
  tone: "surface" | "parchment";
  status: {
    label: string;
    variant: ComponentProps<typeof Badge>["variant"];
  };
  eyebrow?: string | null;
  menu: ReactNode;
  title: string;
  href: string;
  description?: string | null;
  value: string;
  valueNote: string;
  percent: number;
  meta: string;
  notice?: ReactNode;
  action?: ReactNode;
};

/** One item in a creator's dashboard grid: My campaigns and My petitions. */
export function MyItemCard({
  tone,
  status,
  eyebrow,
  menu,
  title,
  href,
  description,
  value,
  valueNote,
  percent,
  meta,
  notice,
  action,
}: Props) {
  return (
    <Card variant={tone} className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        </div>
        {menu}
      </div>

      <Heading as="h2" size="card" className="mt-4 line-clamp-3">
        <Link href={href} className="hover:underline">
          {title}
        </Link>
      </Heading>
      {description && (
        <Small className="mt-2 line-clamp-2 block text-ink/60">
          {description}
        </Small>
      )}

      <div className="mt-auto pt-6">
        <div className="flex items-end justify-between gap-3">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 font-fraunces text-3xl text-ink">
            {value}
            <span className="whitespace-nowrap font-montserrat text-xs text-ink/60">
              {valueNote}
            </span>
          </p>
          <span className="text-sm font-semibold text-forest">{percent}%</span>
        </div>
        <Progress
          value={percent}
          aria-label={`${percent}% of goal`}
          className="mt-3 h-1.5 bg-ink/10"
          indicatorVariant="forest"
        />
        <Small className="mt-3 block text-ink/60">{meta}</Small>

        {notice && <div className="mt-4">{notice}</div>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </Card>
  );
}
