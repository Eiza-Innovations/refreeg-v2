import { formatNaira } from "@/components/giving/format";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatDate } from "@/lib/format-date";
import type { WishlistContributor } from "@/types";

/**
 * Server-rendered owner panel: the one place giver contact details are
 * visible, so the owner can physically buy and hand over each gift.
 */
export function WishlistGivers({
  contributors,
}: {
  contributors: WishlistContributor[];
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <Eyebrow className="text-ink/45">Your givers</Eyebrow>
      <p className="mt-2 text-[13px] leading-5 text-ink/55">
        Names and emails are visible only to you, for delivery coordination.
      </p>
      <ul className="mt-4 space-y-4">
        {contributors.map((giver) => (
          <li
            key={giver.id}
            className="border-b border-hairline pb-4 last:border-none last:pb-0"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-ink">
                {giver.name || giver.email}
                {giver.isAnonymous && (
                  <span className="ml-1.5 text-[12px] font-normal text-ink/45">
                    (gave anonymously)
                  </span>
                )}
              </p>
              <p className="text-sm font-semibold text-forest">
                {formatNaira(giver.amount)}
              </p>
            </div>
            <p className="mt-0.5 text-[12px] text-ink/50">
              for {giver.itemName} ·{" "}
              {giver.createdAt ? formatDate(giver.createdAt) : ""}
            </p>
            {giver.message && (
              <p className="mt-1.5 rounded-lg bg-bone px-3 py-2 text-[13px] italic leading-5 text-ink/70">
                “{giver.message}”
              </p>
            )}
            <a
              href={`mailto:${giver.email}`}
              className="mt-1.5 inline-block text-[12px] font-semibold text-blue-accent hover:underline"
            >
              {giver.email}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
