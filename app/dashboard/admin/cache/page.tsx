"use client";

import { useState } from "react";
import { clearSiteCache } from "@/actions/admin/admin-cache-actions";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";
import {
  H3,
  Heading,
  P,
  Span,
  Strong,
} from "@/components/marketing/Typography";

export default function AdminCachePage() {
  const [isClearingGlobal, setIsClearingGlobal] = useState(false);
  const [isClearingPath, setIsClearingPath] = useState(false);
  const [specificPath, setSpecificPath] = useState("");

  const handleGlobalClear = async () => {
    setIsClearingGlobal(true);
    try {
      const result = await clearSiteCache();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsClearingGlobal(false);
    }
  };

  const handlePathClear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specificPath.trim()) return;

    setIsClearingPath(true);
    try {
      const result = await clearSiteCache(specificPath.trim());
      if (result.success) {
        toast.success(result.message);
        setSpecificPath("");
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsClearingPath(false);
    }
  };

  return (
    <WorkspaceFrame className="mx-auto max-w-4xl space-y-6">
      <div className="mb-2">
        <Heading
          as="h1"
          size="subsection"
          className="font-medium tracking-tight md:text-3xl"
        >
          Cache Management
        </Heading>
        <P className="mt-2 text-ink/60 md:text-sm">
          Manually invalidate the Next.js Data and Full Route Cache to force
          fresh data to appear in production.
        </P>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Global Cache Clear Card */}
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-6 w-6 text-blue-500" />
              <H3 className="font-semibold leading-none tracking-tight md:text-lg">
                Global Purge
              </H3>
            </div>
            <P className="text-muted-foreground md:text-sm">
              This will clear the entire site&apos;s layout cache. It ensures
              everyone sees the absolute latest version of the site, but may
              cause the next immediate page loads to be slightly slower as they
              rebuild.
            </P>
            <Button
              onClick={handleGlobalClear}
              disabled={isClearingGlobal}
              variant="destructive"
              className="mt-4 w-full"
            >
              {isClearingGlobal ? (
                <Span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Purging...
                </Span>
              ) : (
                "Purge All Cache"
              )}
            </Button>
          </div>
        </div>

        {/* Specific Path Clear Card */}
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <H3 className="font-semibold leading-none tracking-tight md:text-lg">
                Targeted Purge
              </H3>
            </div>
            <P className="text-muted-foreground md:text-sm">
              Only clear the cache for a specific route. Best if you just pushed
              a fix to one specific page (e.g.,{" "}
              <code className="bg-muted px-1 rounded">
                /causes/save-the-whales
              </code>
              ) and don&apos;t want to affect the whole site.
            </P>
            <form
              onSubmit={handlePathClear}
              className="flex flex-col gap-3 mt-4"
            >
              <input
                type="text"
                placeholder="e.g. /dashboard/admin/causes"
                value={specificPath}
                onChange={(e) => setSpecificPath(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={isClearingPath || !specificPath.trim()}
                variant="ink"
              >
                {isClearingPath ? (
                  <Span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Purging...
                  </Span>
                ) : (
                  "Purge Specific Path"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-3 text-sm text-blue-800 dark:text-blue-300">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <Strong className="text-current">Note:</Strong> Clearing the cache
          only affects Next.js server-side caching (Data Cache and Full Route
          Cache). If users are still seeing stale data, ask them to hard-refresh
          their browser (
          <kbd className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">
            Ctrl + Shift + R
          </kbd>{" "}
          /{" "}
          <kbd className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">
            Cmd + Shift + R
          </kbd>
          ) to clear their local Browser/Router cache.
        </div>
      </div>
    </WorkspaceFrame>
  );
}
