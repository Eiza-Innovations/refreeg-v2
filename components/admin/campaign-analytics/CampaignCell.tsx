import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Small, Span } from "@/components/marketing/Typography";
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
        <Span className="truncate font-medium text-ink">{title}</Span>
        <Small className="truncate text-ink/50">{owner}</Small>
      </span>
    </span>
  );
}
