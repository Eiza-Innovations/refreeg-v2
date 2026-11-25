import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";

const ManageCauses = dynamic(() => import("@/components/admin/ManageCause"), {
  loading: () => <Skeleton className="h-[800px] w-full" />,
});

export default function AdminCausesPage() {
  return (
    <WorkspaceFrame className="mx-auto max-w-[1440px] space-y-6">
      <ManageCauses />
    </WorkspaceFrame>
  );
}
