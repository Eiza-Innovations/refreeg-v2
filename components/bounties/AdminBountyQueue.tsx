"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { bountyQueueColumns } from "@/app/dashboard/admin/bounties/columns";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bountyQueueStatusOptions } from "@/lib/options/bounty.options";
import type { Bounty, BountyStatus } from "@/types/bounty-types";

const pageSize = 8;

export function AdminBountyQueue({ bounties }: { bounties: Bounty[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BountyStatus | "all">("in-review");
  const [pageIndex, setPageIndex] = useState(0);
  const pendingCount = bounties.filter(
    (bounty) => bounty.status === "in-review",
  ).length;

  const filteredBounties = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return bounties.filter((bounty) => {
      if (status !== "all" && bounty.status !== status) return false;
      if (!needle) return true;
      const haystack =
        `${bounty.title} ${bounty.campaign} ${bounty.owner}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [bounties, search, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Eyebrow>Bounty moderation</Eyebrow>
          <h1 className="font-fraunces text-3xl tracking-tight text-ink sm:text-4xl">
            Review queue
          </h1>
          <p className="text-sm text-ink/60">
            Check that every bounty has a clear task, fair reward and verifiable
            submission.
          </p>
        </div>
        <div className="rounded-xl bg-gold/30 px-4 py-3 text-sm text-ink">
          <strong className="text-lg">{pendingCount}</strong>
          <span className="ml-2 text-ink/60">pending review</span>
        </div>
      </div>

      <Card variant="surface" className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-hairline p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPageIndex(0);
                }}
                className="bg-surface pl-9"
                placeholder="Search bounty, campaign or owner"
                aria-label="Search bounty queue"
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as BountyStatus | "all");
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="w-full bg-surface sm:w-52">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {bountyQueueStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DataTable
            columns={bountyQueueColumns}
            data={filteredBounties}
            pageSize={pageSize}
            pageIndex={pageIndex}
            onPageIndexChange={setPageIndex}
            pagination
          />
        </CardContent>
      </Card>
    </div>
  );
}
