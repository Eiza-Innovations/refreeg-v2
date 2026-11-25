import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/kyc-review";
import { cn } from "@/lib/utils";

export function CampaignCell({
  title,
  owner,
  tone = "neutral",
}: {
  title: string;
  owner: string;
  tone?: "neutral" | "risk";
}) {
  return (
    <span className="flex items-center gap-3 text-left">
      <Avatar className="h-8 w-8">
        <AvatarFallback
          className={cn(
            "text-xs font-semibold",
            tone === "risk" ? "bg-rust/10 text-rust" : "bg-sand/60 text-ink",
          )}
        >
          {initials(title)}
        </AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-ink">{title}</span>
        <span className="truncate text-xs text-ink/50">{owner}</span>
      </span>
    </span>
  );
}
