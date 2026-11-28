"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { toast } from "@/hooks/use-toast";
import { wishlistPublicPath } from "@/lib/wishlist/slug";

export function ShareLinkRow({
  slug,
  ownerUsername,
}: {
  slug: string;
  ownerUsername: string;
}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(
      `${window.location.origin}${wishlistPublicPath({
        ownerUsername,
        slug,
      })}`,
    );
  }, [ownerUsername, slug]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "Share it with your people.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Could not copy automatically",
        description: "Select the link and copy it manually.",
      });
    }
  };

  return (
    <div>
      <Eyebrow className="text-ink/45">Share this wishlist</Eyebrow>
      <div className="mt-2 flex items-stretch gap-2">
        <input
          readOnly
          value={url}
          aria-label="Wishlist share link"
          onFocus={(e) => e.currentTarget.select()}
          className="h-11 min-w-0 flex-1 rounded-md border border-hairline bg-bone px-3 text-[13px] text-ink/70"
        />
        <button
          type="button"
          onClick={copy}
          className="flex h-11 shrink-0 items-center gap-2 rounded-md border border-ink bg-ink px-4 text-[13px] font-semibold text-ink-foreground transition-colors hover:bg-ink/85"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
