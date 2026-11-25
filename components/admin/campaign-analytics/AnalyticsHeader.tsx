"use client";

import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAnalyticsPeriod } from "@/hooks/use-campaign-analytics";
import { analyticsPeriodOptions } from "@/lib/options/campaign-analytics.options";
import type { AnalyticsPeriod } from "@/types/campaign-analytics-types";

const LANDING_HREF = "/dashboard/admin/campaign-analytics";

export function AnalyticsHeader({
  crumb,
  title,
  description,
  onExport,
  showPeriod = true,
  action,
}: {
  crumb?: string;
  title: string;
  description: string;
  onExport?: () => void;
  showPeriod?: boolean;
  action?: React.ReactNode;
}) {
  const { period, setPeriod, compare, setCompare } = useAnalyticsPeriod();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-1">
        {crumb && (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-ink/50"
          >
            <Link href={LANDING_HREF} className="hover:text-ink">
              Campaign analytics
            </Link>
            <ArrowRight className="h-3 w-3" />
            <span>{crumb}</span>
          </nav>
        )}
        <h1 className="font-fraunces text-3xl tracking-tight text-ink">
          {title}
        </h1>
        <p className="text-sm text-ink/60">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {showPeriod && (
          <>
            <Tabs
              value={period}
              onValueChange={(value) => setPeriod(value as AnalyticsPeriod)}
            >
              <TabsList variant="pill" aria-label="Reporting period">
                {analyticsPeriodOptions.map((option) => (
                  <TabsTrigger
                    key={option.value}
                    value={option.value}
                    variant="pill"
                  >
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button
              variant="surface"
              className={cn(compare && "border-ink bg-bone")}
              aria-pressed={compare}
              onClick={() => setCompare(!compare)}
            >
              Compare to last period
            </Button>
          </>
        )}
        {action}
        {onExport && (
          <Button variant="ink" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
      </div>
    </div>
  );
}
