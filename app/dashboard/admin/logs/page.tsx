import AdminLogs from "@/components/admin/AdminLogs";
import { listAdminLogs } from "@/actions/admin/database-actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";

export default async function AdminLogsPage() {
  try {
    const logs = await listAdminLogs();
    return (
      <WorkspaceFrame className="mx-auto max-w-[1440px] space-y-6">
        <AdminLogs logs={logs} />
      </WorkspaceFrame>
    );
  } catch (error) {
    console.error("Error in Admin Logs page:", error);
    return (
      <WorkspaceFrame className="mx-auto max-w-xl py-12">
        <Card className="border border-hairline bg-surface shadow-flat">
          <CardHeader>
            <CardTitle className="font-fraunces text-xl text-ink">
              Failed to load logs
            </CardTitle>
            <CardDescription className="text-ink/60">
              {(error as Error).message || "Unknown error"}
            </CardDescription>
          </CardHeader>
        </Card>
      </WorkspaceFrame>
    );
  }
}
