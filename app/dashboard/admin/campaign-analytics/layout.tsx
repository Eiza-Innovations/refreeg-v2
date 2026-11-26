import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAccessGate>
      <WorkspaceFrame className="mx-auto max-w-[1440px] space-y-6">
        {children}
      </WorkspaceFrame>
    </AdminAccessGate>
  );
}
