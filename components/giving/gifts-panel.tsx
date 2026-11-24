"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilterPills } from "./filter-pills";
import { GiftRow } from "./gift-row";
import {
  getGivingOverview,
  type GiftRow as GiftRowData,
  type GivingFilter,
  type GivingPeriod,
} from "@/actions/donations/giving-actions";
import {
  GIVING_SEARCH_EVENT,
  type GivingSearchDetail,
} from "@/lib/giving/search-event";
import { cn } from "@/lib/utils";

export function GiftsPanel({
  period,
  filter,
  q: initialQ,
  limit: initialLimit,
  pageSize,
  gifts: initialGifts,
  hasMoreGifts: initialHasMore,
}: {
  period: GivingPeriod;
  filter: GivingFilter;
  q: string;
  limit: number;
  pageSize: number;
  gifts: GiftRowData[];
  hasMoreGifts: boolean;
}) {
  const [q, setQ] = useState(initialQ);
  const [limit, setLimit] = useState(initialLimit);
  const [gifts, setGifts] = useState(initialGifts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);

  const load = useCallback(
    async (nextQ: string, nextLimit: number) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      try {
        const overview = await getGivingOverview({
          period,
          filter,
          q: nextQ,
          limit: nextLimit,
        });
        if (seq !== requestSeq.current) return; // a newer request won
        if (!overview) return; // session expired; redirects are server-side
        setGifts(overview.gifts);
        setHasMore(overview.hasMoreGifts);
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [period, filter],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const nextQ = (event as CustomEvent<GivingSearchDetail>).detail.q;
      setQ(nextQ);
      setLimit(initialLimit); // a new search restarts paging
      void load(nextQ, initialLimit);
    };
    window.addEventListener(GIVING_SEARCH_EVENT, handler);
    return () => window.removeEventListener(GIVING_SEARCH_EVENT, handler);
  }, [load, initialLimit]);

  const hrefFor = (value: GivingFilter) => {
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    if (value !== "all") params.set("filter", value);
    if (q) params.set("q", q);
    const query = params.toString();
    return query ? `/dashboard/donations?${query}` : "/dashboard/donations";
  };

  const showMore = () => {
    const next = limit + pageSize;
    setLimit(next);
    void load(q, next);
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="every-gift" className="font-semibold text-ink">
          Every gift
        </h2>
        <FilterPills filter={filter} hrefFor={hrefFor} />
      </div>

      {gifts.length > 0 ? (
        <ul
          aria-busy={loading}
          className={cn(
            "mt-4 space-y-3 transition-opacity",
            loading && "pointer-events-none opacity-60",
          )}
        >
          {gifts.map((gift) => (
            <GiftRow key={`${gift.kind}-${gift.id}`} gift={gift} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-2xl border border-ink/10 shadow-subtle bg-surface px-5 py-8 text-center text-sm text-ink/60">
          {q ? `No gifts match “${q}”.` : "No gifts here for this period yet."}
        </p>
      )}

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={showMore}
            className="text-sm font-semibold text-blue-accent hover:underline"
          >
            Show more gifts
          </button>
        </div>
      )}
    </>
  );
}
