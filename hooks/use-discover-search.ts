import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useDebounce } from "@/hooks/use-debounce";
import type { DiscoverItem } from "@/actions/causes/discover-actions";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX_LENGTH = 100;

export type OrgResult = {
  id: string;
  name: string;
  logoUrl: string | null;
  username: string | null;
  isVerified: boolean;
};

export type DiscoverSearchResponse = {
  campaigns: DiscoverItem[];
  petitions: DiscoverItem[];
  organizations: OrgResult[];
  totalCount: number;
};

async function fetchSearch(
  query: string,
  signal: AbortSignal,
): Promise<DiscoverSearchResponse> {
  const trimmed = query.trim();
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(trimmed.slice(0, SEARCH_MAX_LENGTH))}`,
    { signal },
  );
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  return res.json();
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : (error as { name?: string })?.name === "AbortError";
}

export function useDiscoverSearch({
  onNavigate,
}: {
  onNavigate?: () => void;
} = {}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoverSearchResponse | null>(null);
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchSearch(debouncedQuery, controller.signal)
      .then((data) => {
        setResults(data);
        setLoading(false);
      })
      .catch((error) => {
        if (isAbort(error)) return;
        setResults({
          campaigns: [],
          petitions: [],
          organizations: [],
          totalCount: 0,
        });
        setLoading(false);
      });
    return () => controller.abort();
  }, [debouncedQuery]);

  const goToFullResults = (q: string) => {
    onNavigate?.();
    router.push(`/causes?q=${encodeURIComponent(q)}`);
  };

  const selectCause = (id: string) => {
    onNavigate?.();
    router.push(`/causes/${id}`);
  };

  const selectPetition = (id: string) => {
    onNavigate?.();
    router.push(`/petitions/${id}`);
  };

  const selectOrg = (org: OrgResult) => {
    onNavigate?.();
    if (org.username) router.push(`/${org.username}`);
  };

  return {
    query,
    setQuery,
    loading,
    results,
    goToFullResults,
    selectCause,
    selectPetition,
    selectOrg,
  };
}
