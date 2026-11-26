"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsHeader } from "@/components/admin/campaign-analytics/AnalyticsHeader";
import { KpiCard } from "@/components/admin/campaign-analytics/KpiCard";
import { RiskDetailSheet } from "@/components/admin/campaign-analytics/RiskDetailSheet";
import { useFraudRisk } from "@/hooks/use-campaign-analytics";
import { downloadCsv } from "@/lib/download-csv";
import {
  RISK_HIGH,
  RISK_MEDIUM,
  RISK_SIGNAL_COUNT,
} from "@/lib/campaign-analytics/risk-levels";
import type { RiskRow } from "@/types/campaign-analytics-types";
import { fraudRiskColumns } from "./columns";

const PAGE_SIZE = 10;

export function FraudRiskClient() {
  const risk = useFraudRisk();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const columns = useMemo(
    () => fraudRiskColumns((row: RiskRow) => setSelectedId(row.id)),
    [],
  );

  const rows = risk.data?.rows ?? [];
  const high = rows.filter((row) => row.score >= RISK_HIGH);
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const handleExport = () =>
    downloadCsv(
      "fraud-risk",
      [
        "Campaign",
        "Creator",
        "Risk score",
        "Suggested",
        "Signals",
        "Raised",
        "Donors",
        "Frozen",
      ],
      rows.map((row) => [
        row.title,
        row.owner,
        row.score,
        row.suggestion,
        row.signals.map((signal) => signal.label).join("; "),
        Math.round(row.raised),
        row.donors,
        row.frozen ? "yes" : "no",
      ]),
    );

  return (
    <div className="space-y-6">
      <AnalyticsHeader
        crumb="Fraud risk"
        title="Fraud risk indicators"
        description={`Scored hourly from ${RISK_SIGNAL_COUNT} signals. ${RISK_HIGH}+ is high risk; open a campaign to freeze or take it down.`}
        showPeriod={false}
        onExport={rows.length ? handleExport : undefined}
      />

      {risk.error ? (
        <EmptyState
          variant="page"
          className="py-16"
          icon={<AlertTriangle className="h-7 w-7 text-rust" />}
          title="Risk scores are unavailable"
          description={risk.error}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {!risk.data ? (
              Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl" />
              ))
            ) : (
              <>
                <KpiCard
                  label="Scored campaigns"
                  value={risk.data.scored.toLocaleString()}
                  chip="hourly"
                  chipVariant="blue"
                />
                <KpiCard
                  label={`High risk, ${RISK_HIGH}+`}
                  value={String(high.length)}
                  chip={`${high.filter((row) => row.frozen).length} frozen`}
                  chipVariant="critical"
                />
                <KpiCard
                  label={`Medium, ${RISK_MEDIUM}–${RISK_HIGH - 1}`}
                  value={String(rows.length - high.length)}
                  chip="in review"
                  chipVariant="gold"
                />
                <KpiCard
                  label="Confirmed fraud"
                  value={String(risk.data.confirmedThisMonth)}
                  chip="this month"
                  chipVariant="held"
                />
              </>
            )}
          </div>

          <Card variant="surface" className="overflow-hidden py-0">
            <CardContent className="p-0">
              {!risk.data ? (
                <Skeleton className="m-4 h-64" />
              ) : rows.length === 0 ? (
                <EmptyState
                  variant="page"
                  className="py-16"
                  icon={<ShieldCheck className="h-7 w-7" />}
                  title="No risky campaigns"
                  description={`No live campaign scores ${RISK_MEDIUM} or higher right now. Cleared campaigns stay off this list for 30 days.`}
                />
              ) : (
                <DataTable
                  columns={columns}
                  data={rows}
                  pageSize={PAGE_SIZE}
                  pageIndex={pageIndex}
                  onPageIndexChange={setPageIndex}
                  pagination
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <RiskDetailSheet
        campaign={selected}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
