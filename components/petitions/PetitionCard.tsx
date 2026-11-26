"use client";

import Link from "next/link";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { Heading } from "@/components/marketing/Typography";
import { BookmarkButton } from "@/components/saved/BookmarkButton";

type Props = {
  id: string;
  title: string;
  percent: number;
  signatures: number;
  goal: number;
  organiser?: string | null;
  daysLeft?: number | null;
  /** Server-rendered initial saved state for this petition. */
  initialBookmarked?: boolean;
  /** Opens a sign dialog instead of following the card link. */
  onSignClick?: () => void;
};

/** A petition in a browse grid: Discover and the public petitions page. */
export function PetitionCard({
  id,
  title,
  percent,
  signatures,
  goal,
  organiser,
  daysLeft,
  initialBookmarked = false,
  onSignClick,
}: Props) {
  return (
    <Link
      href={`/petitions/${id}`}
      className="group relative flex h-full min-h-[280px] flex-col rounded-2xl bg-sand p-5 transition-shadow hover:shadow-lg"
    >
      <BookmarkButton
        itemId={id}
        itemType="petition"
        initialSaved={initialBookmarked}
      />

      <Eyebrow className="flex items-center gap-1.5 text-amber">
        <Flag className="h-3.5 w-3.5" />
        Petition
      </Eyebrow>
      <Heading
        as="h2"
        size="card"
        className="mt-3 line-clamp-4 group-hover:underline"
      >
        {title}
      </Heading>
      {organiser && <p className="mt-2 text-xs text-ink/60">{organiser}</p>}

      <div className="mt-auto pt-6">
        <Progress
          value={percent}
          aria-label={`${percent}% of signature goal`}
          className="h-1.5 bg-ink/10"
          indicatorClassName="bg-ink"
        />
        <p className="mt-2 text-xs text-ink/70">
          {signatures.toLocaleString()} of {goal.toLocaleString()} signatures
          {daysLeft != null && ` · ${daysLeft} days left`}
        </p>
        <Button
          variant="ink"
          className="mt-4 h-10 w-full rounded-xl text-sm font-semibold"
          onClick={(event) => {
            if (!onSignClick) return;
            event.preventDefault();
            event.stopPropagation();
            onSignClick();
          }}
        >
          Sign this petition
        </Button>
      </div>
    </Link>
  );
}
