import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Small } from "@/components/marketing/Typography";

/** The small shield line under an auth form's submit button. */
export function AuthTrustNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 pt-2 text-ink/60">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink/45" />
      <Small className="leading-relaxed">{children}</Small>
    </div>
  );
}
