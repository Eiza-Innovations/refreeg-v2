"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

const HIDDEN_PREFIXES = [
  "/auth/signin",
  "/auth/signup",
  "/onboarding",
  "/docs/api",
  "/faq",
];

export function HelpButton() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const hasStickyCta =
    pathname.startsWith("/causes/") &&
    !pathname.includes("/donate") &&
    !pathname.includes("/pledge");

  return (
    <Link
      href="/faq"
      aria-label="Help and FAQ"
      className={cn(
        "fixed right-4 z-[120] inline-flex h-10 items-center gap-2 rounded-full border border-hairline bg-surface px-4 text-sm font-semibold text-ink shadow-flat transition-colors hover:bg-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink sm:bottom-6 sm:right-6",
        hasStickyCta
          ? "bottom-[calc(env(safe-area-inset-bottom)+4.75rem)]"
          : "bottom-[calc(env(safe-area-inset-bottom)+1rem)]",
      )}
    >
      <CircleHelp className="h-4 w-4" />
      <span className="hidden sm:inline">Help</span>
    </Link>
  );
}
