"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Small } from "@/components/marketing/Typography";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ambassadorColumns } from "./columns";
import { Panel } from "./panel";
import type { WorkspaceData } from "./types";

export function AmbassadorsView({ data }: { data: WorkspaceData }) {
  const [filters, setFilters] = useState({ search: "", region: "all" });
  const setFilter = (key: keyof typeof filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const regions = [...new Set(data.ambassadors.map((p) => p.region))].sort();
  const filtered = data.ambassadors.filter(
    (person) =>
      `${person.name} ${person.region}`
        .toLowerCase()
        .includes(filters.search.toLowerCase()) &&
      (filters.region === "all" || person.region === filters.region),
  );

  return (
    <div className="space-y-[18px]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[260px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/60" />
          <Input
            aria-label="Search ambassadors"
            placeholder="Search ambassadors"
            value={filters.search}
            onChange={(event) => setFilter("search", event.target.value)}
            className="h-9 rounded-xl border-0 bg-surface pl-8 text-xs md:text-xs"
          />
        </div>
        <Select
          value={filters.region}
          onValueChange={(value) => setFilter("region", value)}
        >
          <SelectTrigger
            aria-label="Region"
            className="h-9 w-[160px] rounded-xl border-0 bg-surface text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Region · All</SelectItem>
            {regions.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Small>{data.label}</Small>
      </div>
      <Panel className="p-2">
        {filtered.length ? (
          <DataTable columns={ambassadorColumns} data={filtered} />
        ) : (
          <EmptyState
            title={
              data.ambassadors.length
                ? "No ambassadors match these filters"
                : "No referral activity in this period"
            }
          />
        )}
      </Panel>
    </div>
  );
}
