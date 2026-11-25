import AdminLogs from "@/components/admin/AdminLogs";
import { listAdminLogs } from "@/actions/admin/database-actions";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/lib/auth/admin-auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";

export default async function AdminLogsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const role = await getUserRole(session.user.id);

  if (role !== "admin" && role !== "manager") {
    return (
      <WorkspaceFrame className="mx-auto max-w-xl py-12">
        <Card className="border border-hairline bg-surface shadow-flat">
          <CardHeader>
            <CardTitle className="font-fraunces text-xl text-ink">
              Access Denied
            </CardTitle>
            <CardDescription className="text-ink/60">
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </WorkspaceFrame>
    );
  }

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
