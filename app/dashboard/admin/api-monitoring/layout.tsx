import type { ReactNode } from "react";
import ApiMonitoringNav from "@/components/admin/ApiMonitoringNav";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";
import { Heading, P } from "@/components/marketing/Typography";

export default function ApiMonitoringLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceFrame className="mx-auto max-w-[1440px] space-y-6">
      <div>
        <Heading
          as="h1"
          size="subsection"
          className="font-medium tracking-tight md:text-3xl"
        >
          API Monitoring
        </Heading>
        <P className="mt-1 text-ink/60 md:text-sm">
          Monitor API-created campaigns, donation throughput, reports, and
          request health.
        </P>
      </div>

      <ApiMonitoringNav />

      {children}
    </WorkspaceFrame>
  );
}
