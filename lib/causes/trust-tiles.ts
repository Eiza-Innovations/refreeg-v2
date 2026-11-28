import type { CauseDetail } from "@/types/campaign-view-types";

export function buildTrustTiles(cause: CauseDetail) {
  return [
    {
      title: "Milestone escrow",
      status: cause.verified_status === "verified" ? "Active" : "Pending",
      badgeVariant:
        cause.verified_status === "verified"
          ? ("verified" as const)
          : ("pending" as const),
      body: "Funds release only after proof review.",
    },
    {
      title: "Evidence review",
      status: "Active",
      badgeVariant: "blue" as const,
      body: "Latest upload awaiting approval.",
    },
    {
      title: "Impact score",
      status: cause.trust_score?.impact || "B+",
      badgeVariant: "forest" as const,
      body: "Strong delivery confidence.",
    },
    {
      title: "Transparency",
      status: cause.trust_score?.transparency || "High",
      badgeVariant: "secondary" as const,
      body: "Open financials and updates.",
    },
  ];
}
