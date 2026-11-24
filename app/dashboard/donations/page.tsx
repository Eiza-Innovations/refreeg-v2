import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getGivingOverview,
  type GivingFilter,
  type GivingPeriod,
} from "@/actions/donations/giving-actions";
import { GiftsPanel } from "@/components/giving/gifts-panel";
import { PeriodSelect } from "@/components/giving/period-select";
import {
  GivenByCauseCard,
  RecurringGivingCard,
} from "@/components/giving/side-cards";
import { StatCards } from "@/components/giving/stat-cards";
import { formatMonthYear, formatNaira } from "@/components/giving/format";

export const metadata: Metadata = { title: "My giving" };

const PERIODS: GivingPeriod[] = ["year", "last-year", "all"];
const FILTERS: GivingFilter[] = ["all", "delivered", "in-progress", "pledges"];
const PAGE_SIZE = 20;

const NUMBER_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
  "Twenty",
];

/** Small counts read better spelled out at the start of a sentence. */
const countInWords = (n: number) => NUMBER_WORDS[n] ?? n.toLocaleString();

const HEADLINE_VERB: Record<GivingFilter, string> = {
  all: "given",
  delivered: "delivered",
  "in-progress": "in progress",
  pledges: "pledged",
};

export default async function MyGivingPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    filter?: string;
    q?: string;
    limit?: string;
  }>;
}) {
  const params = await searchParams;
  const period = PERIODS.find((p) => p === params.period) ?? "all";
  const filter = FILTERS.find((f) => f === params.filter) ?? "all";
  const q = params.q?.slice(0, 100) ?? "";
  const limit = Math.min(
    Math.max(Number.parseInt(params.limit ?? "", 10) || PAGE_SIZE, PAGE_SIZE),
    500,
  );

  const overview = await getGivingOverview({ period, filter, q, limit });
  if (!overview) redirect("/auth/signin?redirect=/dashboard/donations");

  if (overview.isEmpty) {
    const saved = overview.savedCount;
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
        <EmptyState
          variant="page"
          icon={<Heart className="h-5 w-5" strokeWidth={1.75} />}
          title="Your giving history starts here"
          description={`Once you give, this page tracks where the money went and holds every receipt.${
            saved > 0
              ? ` ${countInWords(saved)} ${saved === 1 ? "campaign is" : "campaigns are"} saved to your list.`
              : ""
          }`}
          action={
            <div className="flex flex-wrap justify-center gap-2.5">
              {saved > 0 && (
                <Link href="/dashboard/saved">
                  <Button
                    variant="ink"
                    className="h-12 rounded-2xl px-[22px] text-[15px] font-semibold shadow-[0_8px_20px_-8px_hsl(var(--ink)/0.55)]"
                  >
                    See your saved campaigns
                  </Button>
                </Link>
              )}
              <Link href="/causes">
                <Button
                  variant={saved > 0 ? "outline" : "ink"}
                  className={
                    saved > 0
                      ? "h-12 rounded-2xl border-hairline bg-surface px-[22px] text-[15px] font-semibold text-ink hover:bg-bone"
                      : "h-12 rounded-2xl px-[22px] text-[15px] font-semibold shadow-[0_8px_20px_-8px_hsl(var(--ink)/0.55)]"
                  }
                >
                  Browse Discover
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const { headline } = overview;
  const periodLabel =
    period === "year"
      ? "this year"
      : period === "last-year"
        ? `in ${new Date().getFullYear() - 1}`
        : "all time";
  const subtitle =
    filter === "all"
      ? [
          `Across ${headline.campaignCount} ${headline.campaignCount === 1 ? "campaign" : "campaigns"}`,
          period === "all" && headline.since
            ? ` since ${formatMonthYear(headline.since)}`
            : ` ${periodLabel}`,
          headline.deliveredCount > 0
            ? ` · ${headline.deliveredCount} marked delivered`
            : "",
        ].join("")
      : `${headline.giftCount} of ${headline.totalGiftCount} gifts · ${periodLabel}`;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-fraunces text-4xl font-medium tracking-tight text-ink sm:text-5xl">
            {formatNaira(headline.amount)} {HEADLINE_VERB[filter]}
          </h1>
          <p className="mt-2 text-sm text-ink/60">{subtitle}</p>
        </div>
        <PeriodSelect period={period} totals={overview.periodTotals} />
      </div>

      <div className="mt-6">
        <StatCards stats={overview.stats} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8" aria-labelledby="every-gift">
          <GiftsPanel
            period={period}
            filter={filter}
            q={q}
            limit={limit}
            pageSize={PAGE_SIZE}
            gifts={overview.gifts}
            hasMoreGifts={overview.hasMoreGifts}
          />
        </section>

        <aside className="space-y-4 lg:col-span-4">
          <RecurringGivingCard recurring={overview.recurring} />
          <GivenByCauseCard causes={overview.givenByCause} />
        </aside>
      </div>
    </div>
  );
}
