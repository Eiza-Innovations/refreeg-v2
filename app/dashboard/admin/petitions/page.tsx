import ManagePetition from "@/components/admin/ManagePetition";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";

export default function AdminPetitionsPage() {
  return (
    <WorkspaceFrame className="mx-auto max-w-[1440px] space-y-6">
      <ManagePetition />
    </WorkspaceFrame>
  );
}
