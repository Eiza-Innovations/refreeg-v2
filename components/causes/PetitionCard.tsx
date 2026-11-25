"use client";

import Link from "next/link";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Heading } from "@/components/marketing/Typography";
import { BookmarkButton } from "../saved/BookmarkButton";

interface PetitionCardProps {
  petition: {
    id: string;
    title: string;
    image?: string | null;
    percentRaised: number;
    days_active?: number | null;
    totalAmount: number;
    goal?: number | null;
    profiles?: {
      full_name?: string;
    } | null;
  };
  /** Server-rendered initial saved state for this petition (from listBookmarkedIds). */
  initialBookmarked?: boolean;
  onSignClick?: () => void;
}

export function PetitionCard({
  petition,
  initialBookmarked = false,
  onSignClick,
}: PetitionCardProps) {
  const daysLeft =
    petition.days_active != null ? Number(petition.days_active) : null;

  return (
    <Link
      href={`/petitions/${petition.id}`}
      className="group relative flex h-full min-h-[280px] flex-col rounded-2xl bg-sand p-5 transition-shadow hover:shadow-lg"
    >
      <BookmarkButton
        itemId={petition.id}
        itemType="petition"
        initialSaved={initialBookmarked}
      />

      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber">
        <Flag className="h-3.5 w-3.5" />
        Petition
      </span>
      <Heading
        as="h2"
        size="subsection"
        className="mt-3 line-clamp-4 text-[22px] leading-tight group-hover:underline md:text-[22px]"
      >
        {petition.title}
      </Heading>
      <p className="mt-2 text-xs text-ink/60">
        {petition.profiles?.full_name || "Unknown organiser"}
      </p>

      <div className="mt-auto pt-6">
        <Progress
          value={petition.percentRaised}
          aria-label={`${petition.percentRaised}% of signature goal`}
          className="h-1.5 bg-ink/10"
          indicatorClassName="bg-ink"
        />
        <p className="mt-2 text-xs text-ink/70">
          {petition.totalAmount.toLocaleString()} of{" "}
          {petition.goal?.toLocaleString() ?? "—"} signatures
          {daysLeft != null && ` · ${daysLeft} days left`}
        </p>
        <Button
          variant="ink"
          className="mt-4 h-10 w-full rounded-xl text-sm font-semibold"
          onClick={(e) => {
            if (!onSignClick) return;
            e.preventDefault();
            e.stopPropagation();
            onSignClick();
          }}
        >
          Sign this petition
        </Button>
      </div>
    </Link>
  );
}
