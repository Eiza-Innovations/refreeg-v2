"use client";

import Image from "next/image";
import { Flag, Building2, BadgeCheck, Loader2 } from "lucide-react";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getMediaUrl } from "@/lib/s3/media";
import type { useDiscoverSearch } from "@/hooks/use-discover-search";
import type { DiscoverItem } from "@/actions/causes/discover-actions";

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-300/50 text-inherit rounded-sm">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/** The row used for campaign hits. */
function CampaignRow({
  item,
  query,
  onSelect,
}: {
  item: DiscoverItem;
  query: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem onSelect={onSelect} className="gap-3">
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-slate-100">
        {item.image && (
          <Image
            src={getMediaUrl(item.image) || "/icons/placeholder.svg"}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          <HighlightedText text={item.title} query={query} />
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.orgName} · {item.percent}% funded
          {item.urgent ? " · Urgent" : ""}
        </p>
      </div>
    </CommandItem>
  );
}

export function DiscoverSearchResults({
  search,
  inputPlaceholder = "Search campaigns, petitions, organisations…",
  autoFocus,
  listClassName,
  hideInput = false,
}: {
  search: ReturnType<typeof useDiscoverSearch>;
  inputPlaceholder?: string;
  autoFocus?: boolean;

  listClassName?: string;
  /** Set when the caller renders its own input (inline combobox header). */
  hideInput?: boolean;
}) {
  const {
    query,
    setQuery,
    loading,
    results,
    goToFullResults,
    selectCause,
    selectPetition,
    selectOrg,
  } = search;

  return (
    <>
      {!hideInput && (
        <CommandInput
          placeholder={inputPlaceholder}
          value={query}
          onValueChange={setQuery}
          autoFocus={autoFocus}
        />
      )}
      <CommandList className={listClassName}>
        {query.trim() && loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Searching…
          </div>
        )}

        {query.trim() && !loading && results && (
          <>
            {results.totalCount === 0 && (
              <CommandEmpty>No matches for “{query}”.</CommandEmpty>
            )}

            {results.campaigns.length > 0 && (
              <CommandGroup heading="Campaigns">
                {results.campaigns.map((item) => (
                  <CampaignRow
                    key={item.id}
                    item={item}
                    query={query}
                    onSelect={() => selectCause(item.id)}
                  />
                ))}
              </CommandGroup>
            )}

            {results.petitions.length > 0 && (
              <CommandGroup heading="Petitions">
                {results.petitions.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => selectPetition(item.id)}
                    className="gap-3"
                  >
                    <Flag className="h-4 w-4 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        <HighlightedText text={item.title} query={query} />
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.raised.toLocaleString()} of{" "}
                        {item.goal.toLocaleString()} signatures
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.organizations.length > 0 && (
              <CommandGroup heading="Organisations">
                {results.organizations.map((org) => (
                  <CommandItem
                    key={org.id}
                    onSelect={() => selectOrg(org)}
                    className="gap-3"
                  >
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <span className="flex-1 truncate">
                      <HighlightedText text={org.name} query={query} />
                    </span>
                    {org.isVerified && (
                      <BadgeCheck className="h-4 w-4 text-blue-600" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.totalCount > 0 && (
              <>
                <CommandSeparator />
                <CommandItem onSelect={() => goToFullResults(query)}>
                  See all {results.totalCount} results
                </CommandItem>
              </>
            )}
          </>
        )}
      </CommandList>
    </>
  );
}
