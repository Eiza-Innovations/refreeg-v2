"use client";

import { P } from "@/components/marketing/Typography";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/admin/workspace/panel";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";
import { useAdminOverview } from "@/hooks/use-admin-overview";
import { OverviewContent } from "./overview-content";
import { OverviewSkeleton } from "./overview-skeleton";
import "@/components/admin/workspace/workspace.css";

export function AdminOverview({
  greeting,
  dateLine,
}: {
  greeting: string;
  dateLine: string;
}) {
  const { data, isLoading, error, refetch } = useAdminOverview();

  if (isLoading) {
    return (
      <WorkspaceFrame>
        <OverviewSkeleton />
      </WorkspaceFrame>
    );
  }
  if (error || !data) {
    return (
      <WorkspaceFrame>
        <Panel title="Couldn't load the overview" className="max-w-xl">
          <div role="alert">
            <P className="text-ink/70">{error?.message}</P>
          </div>
          <Button variant="ink" className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </Panel>
      </WorkspaceFrame>
    );
  }
  return (
    <OverviewContent data={data} greeting={greeting} dateLine={dateLine} />
  );
}
