"use client";

import { useState, useTransition } from "react";
import { parseAsString, useQueryState } from "nuqs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsContent } from "./workspace/analytics";
import { CampaignDialog } from "./workspace/campaign-dialog";
import { DetailContent } from "./workspace/details";
import { Chip } from "./workspace/chip";
import { MetricCards } from "./workspace/metric-cards";
import { PageHeading } from "./workspace/page-heading";
import type { Period, WorkspaceData, WorkspaceView } from "./workspace/types";
import { downloadCsv } from "@/lib/admin-workspace";
import "./workspace/workspace.css";

const VIEWS: WorkspaceView[] = ["analytics", "ambassadors", "users", "eiza"];
const campaignPanel = (id: string) => `campaign:${id}`;

export function AnalyticsWorkspace({ data }: { data: WorkspaceData }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [compare, setCompare] = useState(true);
  // One shareable param: a view name, or "campaign:<id>" for the open campaign
  // dialog (only reachable from the analytics view, so the two never overlap).
  const [panel, setPanel] = useQueryState(
    "view",
    parseAsString.withDefault("analytics"),
  );
  const view = VIEWS.find((value) => value === panel) ?? "analytics";
  const selected =
    data.topCampaigns.find((row) => campaignPanel(row.item.id) === panel)
      ?.item ?? null;
  const period = data.period;
  const heading = {
    analytics: "Analytics",
    ambassadors: "Ambassador performance",
    users: "User growth & retention",
    eiza: "EIZA coin distribution",
  }[view];
  const updated = new Date(data.generatedAt).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });

  function choosePeriod(value: Period) {
    if (value === period) return;
    startTransition(() => router.push(`${pathname}?period=${value}`));
  }

  function exportMetrics() {
    const rows = [
      ["Period", period],
      ["Range", data.label],
      ["Generated", data.generatedAt],
      ["Metric", "Value", "Change"],
      ...data.metrics.map((metric) => [
        metric.label,
        metric.value,
        metric.change ?? "",
      ]),
    ];
    downloadCsv(
      rows,
      `refreeg-analytics-${period}-${data.generatedAt.slice(0, 10)}.csv`,
    );
  }

  return (
    <div className="admin-workspace text-ink">
      <main className="mx-auto min-w-0 w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading
            title={heading}
            subtitle={`${data.label} · all figures in naira`}
          />
          <Chip tone="neutral">Updated {updated} WAT</Chip>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          {view === "analytics" ? (
            <>
              <div
                role="group"
                aria-label="Reporting period"
                className="flex rounded-xl bg-surface p-1"
              >
                {(["day", "month", "year"] as const).map((value) => (
                  <Button
                    key={value}
                    variant={period === value ? "ink" : "ghost"}
                    className="rounded-lg capitalize"
                    aria-pressed={period === value}
                    disabled={pending}
                    onClick={() => choosePeriod(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
              {period !== "day" && (
                <Button
                  variant={compare ? "ink" : "surface"}
                  aria-pressed={compare}
                  onClick={() => setCompare(!compare)}
                >
                  Compare to last period
                </Button>
              )}
              <Button variant="ink" className="gap-2" onClick={exportMetrics}>
                <ArrowDownToLine className="h-4 w-4" /> Export metrics
              </Button>
              <Button asChild variant="surface">
                <Link href="/dashboard/admin/analytics/operations">
                  Operational reports
                </Link>
              </Button>
            </>
          ) : (
            <Button
              variant="surface"
              className="gap-2"
              onClick={() => setPanel("analytics")}
            >
              <ArrowLeft className="h-4 w-4" /> Back to analytics
            </Button>
          )}
        </div>
        <div
          aria-busy={pending}
          className={pending ? "pointer-events-none opacity-60" : undefined}
        >
          {view === "analytics" ? (
            <div className="space-y-6">
              <MetricCards metrics={data.metrics} loading={pending} />
              <div className="overflow-x-auto">
                <AnalyticsContent
                  data={data}
                  compare={compare}
                  onView={setPanel}
                  onSelect={(item) => setPanel(campaignPanel(item.id))}
                />
              </div>
            </div>
          ) : (
            <DetailContent key={view} view={view} data={data} />
          )}
        </div>
      </main>
      <CampaignDialog
        campaign={selected}
        onClose={() => setPanel("analytics")}
      />
    </div>
  );
}
