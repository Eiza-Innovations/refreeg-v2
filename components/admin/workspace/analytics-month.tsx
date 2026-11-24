"use client";

import { Small, Strong } from "@/components/marketing/Typography";
import { EmptyState } from "@/components/ui/empty-state";
import { BarPlot, Donut, LinePlot } from "./charts";
import { Chip } from "./chip";
import { Panel } from "./panel";
import { PlainButton } from "./plain-button";
import { Person } from "./person";
import type { AnalyticsViewProps } from "./types";

const titleButton = "text-sm font-semibold text-ink hover:underline";

export function AnalyticsMonth({ data, compare, onView }: AnalyticsViewProps) {
  const { donations } = data;
  return (
    <div className="space-y-[18px]">
      <div className="grid gap-4 xl:grid-cols-[1.78fr_1fr]">
        <Panel title="Donations by day">
          <div className="[&_svg]:h-[165px]">
            <LinePlot
              values={donations.values}
              previous={compare ? donations.previous : undefined}
              labels={donations.labels}
            />
          </div>
          <div className="mt-4 flex gap-1.5">
            <Chip tone="blue" dot>
              This month
            </Chip>
            {compare && (
              <Chip tone="neutral" dot>
                {data.previousLabel}
              </Chip>
            )}
          </div>
        </Panel>
        <Panel title="Campaigns">
          <Donut
            tones={["green", "gold", "red"]}
            segments={data.campaignStatus.segments}
            total={data.campaignStatus.total}
            caption="live"
          />
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title={
            <PlainButton className={titleButton} onClick={() => onView("eiza")}>
              EIZA coins issued
            </PlainButton>
          }
          aside={<Small>{data.eiza.total} this month</Small>}
        >
          {data.eiza.segments.length ? (
            <Donut
              segments={data.eiza.segments}
              total={data.eiza.total}
              size={116}
            />
          ) : (
            <EmptyState title="No EIZA issued this month" />
          )}
        </Panel>
        <Panel
          title={
            <PlainButton
              className={titleButton}
              onClick={() => onView("ambassadors")}
            >
              Top ambassadors
            </PlainButton>
          }
          aside={<Small>Donations driven</Small>}
        >
          {data.ambassadors.length ? (
            <div className="space-y-4">
              {data.ambassadors.slice(0, 4).map((person, i) => (
                <PlainButton
                  key={person.id}
                  className="w-full justify-start gap-3 text-left"
                  onClick={() => onView("ambassadors")}
                >
                  <div className="min-w-0 flex-1">
                    <Person
                      name={person.name}
                      detail={person.region}
                      initials={person.initials}
                      tone={i === 0 ? "blue" : "green"}
                    />
                  </div>
                  <span className="hidden xl:block [&>div]:w-[60px]">
                    <LinePlot values={person.trend} small tone="green" />
                  </span>
                  <Strong className="text-xs">{person.donations}</Strong>
                </PlainButton>
              ))}
            </div>
          ) : (
            <EmptyState title="No referral activity this month" />
          )}
        </Panel>
        <Panel
          title={
            <PlainButton
              className={titleButton}
              onClick={() => onView("users")}
            >
              Users
            </PlainButton>
          }
          aside={<Small>Active, last 30 days</Small>}
        >
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <Strong className="text-2xl">{data.users.monthlyActive}</Strong>
              <Small className="mt-1 block">{data.users.change}</Small>
            </div>
            <div>
              <Strong className="text-2xl">{data.users.retention}</Strong>
              <Small className="mt-1 block">30-day retention</Small>
            </div>
          </div>
          <BarPlot
            values={data.users.trend}
            className="h-[70px]"
            lastTone="green"
          />
        </Panel>
      </div>
    </div>
  );
}
