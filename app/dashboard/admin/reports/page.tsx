import { redirect } from "next/navigation";
import { getUserRole } from "@/actions/admin/role-actions";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { listModerationReports } from "@/lib/moderation/moderation-service";
import { ModerationReportsClient } from "./ModerationReportsClient";

export const metadata = { title: "Content Reports | RefreeG Admin" };

export default async function AdminModerationReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }> | { status?: string };
}) {
  const params = (await searchParams) ?? {};
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/auth/signin");
  }

  const userRole = await getUserRole(userId);
  if (userRole !== "admin" && userRole !== "manager") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Card className="bg-surface border-hairline shadow-none">
          <CardHeader>
            <CardTitle className="font-fraunces text-ink">
              Access Denied
            </CardTitle>
            <CardDescription>
              You do not have permission to access the moderation queue.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const activeStatus =
    params.status === "pending" ||
    params.status === "actioned" ||
    params.status === "dismissed"
      ? params.status
      : undefined;

  const { reports, counts } = await listModerationReports({
    status: activeStatus,
  });

  return (
    <ModerationReportsClient
      reports={reports}
      counts={counts}
      activeStatus={activeStatus ?? "all"}
    />
  );
}
