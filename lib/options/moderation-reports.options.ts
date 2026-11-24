export interface ModerationStatusTabOption {
  readonly label: string;
  readonly value: "pending" | "actioned" | "dismissed" | "all";
}

export const moderationStatusTabOptions = [
  { label: "Pending", value: "pending" },
  { label: "Actioned", value: "actioned" },
  { label: "Dismissed", value: "dismissed" },
  { label: "All Reports", value: "all" },
] as const satisfies readonly ModerationStatusTabOption[];
