import type { ReactNode } from "react";
import ApiMonitoringNav from "@/components/admin/ApiMonitoringNav";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";

export default function ApiMonitoringLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceFrame className="mx-auto max-w-[1440px] space-y-6">
      <div>
        <h1 className="font-fraunces text-3xl font-medium tracking-tight text-ink">API Monitoring</h1>
        <p className="mt-1 text-sm text-ink/60">
          Monitor API-created campaigns, donation throughput, reports, and
          request health.
        </p>
      </div>

      <ApiMonitoringNav />

      {children}
    </WorkspaceFrame>
  );
}
