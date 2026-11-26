import { OverviewSkeleton } from "@/components/admin/overview/overview-skeleton";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";

export default function AdminLoading() {
  return (
    <WorkspaceFrame>
      <OverviewSkeleton />
    </WorkspaceFrame>
  );
}
