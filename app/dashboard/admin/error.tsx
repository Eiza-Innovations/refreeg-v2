"use client";

import { useEffect } from "react";
import { P } from "@/components/marketing/Typography";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/admin/workspace/panel";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";
import { reportClientError } from "@/lib/api/client-error-reporter";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, { type: "react" });
  }, [error]);

  return (
    <WorkspaceFrame>
      <Panel title="Couldn't load this page" className="max-w-xl">
        <P className="text-ink/70">{error.message}</P>
        <Button variant="ink" className="mt-4" onClick={reset}>
          Try again
        </Button>
      </Panel>
    </WorkspaceFrame>
  );
}
