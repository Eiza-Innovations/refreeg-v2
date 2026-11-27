import { Badge } from "@/components/ui/badge";
import type { BountyStatus } from "@/types/bounty-types";

const statusCopy = {
  draft: { label: "Draft", variant: "secondary" },
  "in-review": { label: "In review", variant: "pending" },
  "changes-requested": { label: "Changes requested", variant: "critical" },
  live: { label: "Approved · Live", variant: "cleared" },
} as const;

export function BountyStatusBadge({ status }: { status: BountyStatus }) {
  const copy = statusCopy[status];
  return <Badge variant={copy.variant}>{copy.label}</Badge>;
}
