"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, RotateCcw, Search, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  setWishlistAdminStatus,
  type AdminWishlistRow,
} from "@/actions/admin/admin-wishlist-actions";
import {
  wishlistStatusTabs,
  type WishlistQueueTab,
} from "@/lib/options/wishlist-review.options";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const statusBadge: Record<
  string,
  { label: string; variant: "forest" | "pending" | "destructive" }
> = {
  active: { label: "Live", variant: "forest" },
  archived: { label: "Archived", variant: "pending" },
  removed: { label: "Removed", variant: "destructive" },
};

export function WishlistQueueClient({
  rows,
  counts,
}: {
  rows: AdminWishlistRow[];
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<WishlistQueueTab>("live");
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const statuses =
      wishlistStatusTabs.find((t) => t.value === tab)?.statuses ??
      ([] as string[]);
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!statuses.includes(row.status)) return false;
      if (!q) return true;
      return (
        row.title.toLowerCase().includes(q) ||
        row.ownerName.toLowerCase().includes(q) ||
        row.ownerUsername.toLowerCase().includes(q) ||
        row.ownerEmail.toLowerCase().includes(q)
      );
    });
  }, [rows, tab, query]);

  const [page, setPage] = useState(0);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const changeStatus = async (
    row: AdminWishlistRow,
    status: "removed" | "active",
  ) => {
    setPendingId(row.id);
    const result = await setWishlistAdminStatus(row.id, status);
    setPendingId(null);
    if (!result.success) {
      toast({
        title: result.error || "Could not update the wishlist",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: status === "removed" ? "Wishlist removed" : "Wishlist restored",
    });
    startTransition(() => router.refresh());
  };

  const tabCount = (value: WishlistQueueTab) =>
    value === "all" ? counts.all : (counts[value] ?? 0);

  return (
    <div className="space-y-4">
      <nav
        aria-label="Wishlist status"
        className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-hairline bg-bone p-1"
      >
        {wishlistStatusTabs.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-current={tab === t.value ? "page" : undefined}
            onClick={() => {
              setTab(t.value);
              setPage(0);
            }}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.value
                ? "bg-white text-ink shadow-subtle"
                : "text-ink/60 hover:text-ink",
            )}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-ink/50">
              {tabCount(t.value)}
            </span>
          </button>
        ))}
      </nav>

      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search title, owner, email"
          aria-label="Search wishlists"
          className="w-full pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-hairline bg-cream-muted/60 text-xs uppercase tracking-wide text-ink/55">
              <tr>
                <th className="px-4 py-3 font-semibold">Wishlist</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Visibility</th>
                <th className="px-4 py-3 font-semibold">Gifts</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {pageRows.map((row) => {
                const badge = statusBadge[row.status] ?? statusBadge.active;
                return (
                  <tr key={row.id} className="align-middle">
                    <td className="max-w-[220px] px-4 py-3">
                      {row.sharePath ? (
                        <Link
                          href={row.sharePath}
                          className="line-clamp-1 font-medium text-ink underline-offset-2 hover:underline"
                        >
                          {row.title}
                        </Link>
                      ) : (
                        <span className="line-clamp-1 font-medium text-ink">
                          {row.title}
                        </span>
                      )}
                      <span className="block text-xs text-ink/50">
                        {row.itemCount} items
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block line-clamp-1 text-ink">
                        {row.ownerName}
                      </span>
                      <span className="block text-xs text-ink/50">
                        @{row.ownerUsername || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.isPublic ? "blue" : "held"}>
                        {row.isPublic ? "Public" : "Private"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink">
                      ₦{row.giftsTotal.toLocaleString()}
                      <span className="block text-xs text-ink/50">
                        of ₦{row.targetTotal.toLocaleString()} goal
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {row.sharePath ? (
                          <Button asChild variant="surface" size="sm">
                            <Link
                              href={row.sharePath}
                              aria-label={`Open ${row.title}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}
                        {row.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pendingId === row.id}
                            onClick={() => changeStatus(row, "removed")}
                          >
                            <ShieldOff className="mr-1.5 h-4 w-4" />
                            Remove
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pendingId === row.id}
                            onClick={() => changeStatus(row, "active")}
                          >
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            Restore
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pageRows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink/60">
            No wishlists in this tab{query ? " for this search" : ""}.
          </p>
        ) : null}
        {pageCount > 1 ? (
          <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm">
            <span className="text-ink/60">
              Page {page + 1} of {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
