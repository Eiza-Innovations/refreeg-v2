"use client";

import Link from "next/link";
import {
  ExternalLink,
  LifeBuoy,
  MessageCircleMore,
  RefreshCcw,
} from "lucide-react";
import { Heading, Lead } from "@/components/marketing/Typography";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Card } from "@/components/ui/card";
import { socialLinks } from "@/lib/links";
import { cn } from "@/lib/utils";
import type { SupportErrorCtaProps } from "@/types/support-types";

export function SupportErrorCta({
  title = "Something went wrong",
  description = "For customer support, follow us on X and join our Telegram community. Our team shares updates and responds there.",
  errorMessage,
  onRetry,
  retryLabel = "Try again",
  compact = false,
}: SupportErrorCtaProps) {
  return (
    <Card variant="surface" className={cn(compact ? "p-5" : "p-6 sm:p-8")}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-lime">
          <LifeBuoy className="h-5 w-5" />
        </span>
        <div className="space-y-2">
          <Heading as="h2" size="panel">
            {title}
          </Heading>
          <Lead className="max-w-2xl text-sm text-ink/70 md:text-sm">
            {description}
          </Lead>
        </div>
      </div>

      {errorMessage ? (
        <CalloutBanner
          variant="rust"
          title={errorMessage}
          className="mt-4 break-words"
        />
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href={socialLinks.twitter}
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-hairline bg-surface p-4 transition hover:border-ink/40 hover:shadow-card"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Follow us on X</p>
            <ExternalLink className="h-4 w-4 text-ink/50 transition group-hover:text-ink" />
          </div>
          <p className="mt-2 text-sm text-ink/60">
            Get platform updates and support announcements.
          </p>
        </Link>

        <Link
          href={socialLinks.community}
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-blue-accent/30 bg-blue-accent/10 p-4 transition hover:border-blue-accent hover:shadow-card"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Join Telegram</p>
            <MessageCircleMore className="h-4 w-4 text-blue-accent" />
          </div>
          <p className="mt-2 text-sm text-ink/70">
            Reach the community and customer support team faster.
          </p>
        </Link>
      </div>

      {onRetry ? (
        <div className="mt-5 flex justify-start">
          <Button
            type="button"
            variant="ink"
            onClick={onRetry}
            className="h-11 rounded-md px-5"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
