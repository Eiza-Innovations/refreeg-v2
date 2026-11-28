import { goalPercent } from "@/lib/progress";
import type { Cause, Petition } from "@/types";
import type { DiscoverItem, DiscoverSort } from "@/types/discover-types";

export function compareDiscoverItems(
  a: DiscoverItem,
  b: DiscoverItem,
  sortBy: DiscoverSort,
): number {
  if (a.paused !== b.paused) return a.paused ? 1 : -1;

  switch (sortBy) {
    case "closest-to-goal":
      return b.percent - a.percent;
    case "most-given":
      return b.raised - a.raised;
    case "most-urgent":
    case "closing-soonest":
      if (a.daysLeft == null && b.daysLeft == null) return 0;
      if (a.daysLeft == null) return 1;
      if (b.daysLeft == null) return -1;
      return a.daysLeft - b.daysLeft;
    case "newest":
    default:
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
}

function daysLeftFromEndDate(
  endDate: string | null | undefined,
): number | null {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function causeToDiscoverItem(cause: Cause): DiscoverItem {
  const daysLeft = daysLeftFromEndDate(cause.end_date);
  const goal = Number(cause.goal || 0);
  const raised = Number(cause.raised || 0);
  return {
    type: "campaign",
    id: cause.id,
    title: cause.title,
    image: cause.image || null,
    orgName: cause.profiles?.full_name || "Anonymous",
    verified: !!cause.profiles?.is_verified,
    raised,
    goal,
    percent: goalPercent(raised, goal),
    daysLeft,
    urgent: daysLeft != null && daysLeft <= 7,
    location: cause.location || null,
    paused: !!cause.paused,
    createdAt: cause.created_at,
    giftCount: null,
  };
}

export function petitionToDiscoverItem(petition: Petition): DiscoverItem {
  const goal = Number(petition.goal || 0);
  const raised = Number(petition.raised || 0);
  return {
    type: "petition",
    id: petition.id,
    title: petition.title,
    image: petition.image || null,
    orgName: petition.profiles?.full_name || "Anonymous",
    verified: !!petition.profiles?.is_verified,
    raised,
    goal,
    percent: goalPercent(raised, goal),
    daysLeft: null,
    urgent: false,
    location: null,
    paused: false,
    createdAt: petition.created_at,
    giftCount: null,
  };
}

/** Rounds up to a clean slider step: whole millions, else hundred-thousands. */
export function niceCeiling(value: number) {
  if (value <= 0) return 1_000_000;
  const step = value >= 1_000_000 ? 1_000_000 : 100_000;
  return Math.ceil(value / step) * step;
}
