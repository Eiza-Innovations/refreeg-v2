"use client";

import Link from "next/link";
import { Gift, HandCoins } from "lucide-react";
import { formatNaira } from "@/components/giving/format";
import { formatDate } from "@/components/profile/profile-display";
import type { GivingEntry } from "@/components/profile/profile-types";

interface ProfileGivingListProps {
  entries: GivingEntry[];
}

export function ProfileGivingList({ entries }: ProfileGivingListProps) {
  return (
    <ul className="space-y-3">
      {entries.map((entry) => {
        const Icon = entry.kind === "wishlist" ? Gift : HandCoins;
        const body = (
          <>
            <span
              className={
                entry.kind === "wishlist"
                  ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest/10 text-forest"
                  : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan/15 text-cyan-800"
              }
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink group-hover:text-forest">
                {entry.title}
              </span>
              <span className="mt-0.5 block truncate text-xs text-ink/55">
                {entry.context} ·{" "}
                {entry.isAnonymous ? "Anonymous gift" : entry.giverLabel} ·{" "}
                {formatDate(entry.createdAt)}
              </span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">
              {formatNaira(entry.amount)}
            </span>
          </>
        );

        return (
          <li key={entry.id}>
            {entry.href ? (
              <Link
                href={entry.href}
                className="group flex items-center gap-x-3 gap-y-1 rounded-2xl border border-hairline bg-surface p-4 transition-colors hover:border-ink/20"
              >
                {body}
              </Link>
            ) : (
              <div className="flex items-center gap-x-3 gap-y-1 rounded-2xl border border-hairline bg-surface p-4">
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
