"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import { formatNaira } from "@/components/giving/format";

interface DashboardGivingCardProps {
  givenSoFar: number;
  /** Causes-only total; the split rows render when these are provided. */
  causesGiven?: number;
  wishlistsGiven?: number;
  wishlistGifts?: number;
  campaignsBacked: number;
  livePledges: number;
  eizaBalance?: number;
}

export function DashboardGivingCard({
  givenSoFar,
  causesGiven,
  wishlistsGiven,
  wishlistGifts,
  campaignsBacked,
  livePledges,
  eizaBalance = 0,
}: DashboardGivingCardProps) {
  const showSplit = causesGiven !== undefined && wishlistsGiven !== undefined;

  return (
    <div className="p-5 bg-white rounded-xl border border-ink/10 sm:p-6">
      <Eyebrow className="text-[11px] font-bold uppercase tracking-wider text-ink/50">
        Your giving
      </Eyebrow>

      <div className="mt-2">
        <p className="font-fraunces text-4xl font-medium tracking-tight text-ink">
          {formatNaira(givenSoFar)}
        </p>
        <p className="mt-1 text-xs text-ink/60">
          {showSplit ? "given so far, causes and wishlists" : "given so far"}
        </p>
      </div>

      <div className="my-4 border-t border-ink/10" />

      <div className="space-y-2.5 text-sm">
        {showSplit && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-ink/70">To causes</span>
              <span className="font-semibold text-ink">
                {formatNaira(causesGiven ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/70">
                To wishlists
                {wishlistGifts ? (
                  <span className="ml-1.5 text-xs text-ink/50">
                    {wishlistGifts} {wishlistGifts === 1 ? "gift" : "gifts"}
                  </span>
                ) : null}
              </span>
              <span className="font-semibold text-ink">
                {formatNaira(wishlistsGiven ?? 0)}
              </span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between">
          <span className="text-ink/70">Campaigns backed</span>
          <span className="font-semibold text-ink">{campaignsBacked}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink/70">Live pledges</span>
          <span className="font-semibold text-ink">{livePledges}</span>
        </div>
        {/* EIZA Balance (commented out per user request)
        <div className="flex items-center justify-between">
          <span className="text-ink/70">EIZA balance</span>
          <span className="font-semibold text-amber">{eizaBalance.toLocaleString()}</span>
        </div>
        */}
      </div>
    </div>
  );
}
