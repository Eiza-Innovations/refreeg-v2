"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Strong } from "@/components/marketing/Typography";
import type { DataTableFeatures } from "@/components/ui/data-table-features";
import { LinePlot } from "./charts";
import { PlainButton } from "./plain-button";
import { Person } from "./person";
import type { Ambassador, TopCampaign, WorkItem } from "./types";

const campaignHelper = createColumnHelper<DataTableFeatures, TopCampaign>();
const ambassadorHelper = createColumnHelper<DataTableFeatures, Ambassador>();

export const topCampaignColumns = (onSelect: (item: WorkItem) => void) =>
  campaignHelper.columns([
    campaignHelper.display({
      id: "campaign",
      header: "Campaign today",
      cell: ({ row }) => (
        <PlainButton
          className="text-left"
          onClick={() => onSelect(row.original.item)}
        >
          <Person
            name={row.original.item.name}
            detail={row.original.item.detail}
            initials={row.original.item.initials}
            tone={row.original.item.avatar}
          />
        </PlainButton>
      ),
    }),
    campaignHelper.accessor("given", {
      header: "Given",
      cell: (info) => <Strong>{info.getValue()}</Strong>,
    }),
    campaignHelper.accessor("donors", {
      header: "Donors",
      cell: (info) => <Strong>{info.getValue()}</Strong>,
    }),
    campaignHelper.accessor("averageGift", {
      header: "Average gift",
      cell: (info) => <Strong>{info.getValue()}</Strong>,
    }),
    campaignHelper.display({
      id: "trend",
      header: "Last 7 days",
      cell: ({ row }) => (
        <LinePlot
          small
          values={row.original.trend}
          tone={row.index === 2 ? "blue" : "green"}
        />
      ),
    }),
  ]);

export const ambassadorColumns = ambassadorHelper.columns([
  ambassadorHelper.display({
    id: "ambassador",
    header: "Ambassador",
    cell: ({ row }) => (
      <Person
        name={row.original.name}
        detail="Ambassador"
        initials={row.original.initials}
        tone={row.index % 3 === 0 ? "blue" : "green"}
      />
    ),
  }),
  ambassadorHelper.accessor("region", { header: "Region" }),
  ambassadorHelper.accessor("referrals", {
    header: "Referrals",
    cell: (info) => <Strong>{info.getValue()}</Strong>,
  }),
  ambassadorHelper.accessor("signupRate", {
    header: "Sign-up rate",
    cell: (info) => <Strong>{info.getValue()}</Strong>,
  }),
  ambassadorHelper.accessor("donations", {
    header: "Donations driven",
    cell: (info) => <Strong>{info.getValue()}</Strong>,
  }),
  ambassadorHelper.accessor("rewards", {
    header: "Rewards earned",
    cell: (info) => <Strong>{info.getValue()}</Strong>,
  }),
  ambassadorHelper.display({
    id: "trend",
    header: "Last 6 months",
    cell: ({ row }) => (
      <LinePlot small tone="green" values={row.original.trend} />
    ),
  }),
]);
