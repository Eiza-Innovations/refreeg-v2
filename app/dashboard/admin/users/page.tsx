import type React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";
import { PageHeading } from "@/components/admin/workspace/page-heading";
import { UserSearch } from "@/components/engagement/Search";
import { auth } from "@/lib/auth/auth";
import {
  getUserRole,
  listUsersWithRolesPage,
  getPendingKycSummary,
} from "@/actions/admin/role-actions";
import type { UsersWithRolesPage } from "@/actions/admin/role-actions";
import { ExportCSVButton } from "./components/export-csv-button";
import { SendKycReminderButton } from "./components/send-kyc-reminder-button";
import { UsersTable } from "./users-table";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/auth/signin");
  }

  const requestedPage = Math.max(Number.parseInt(params.page || "1") || 1, 1);
  let usersPage: UsersWithRolesPage;
  let pendingKyc: { count: number; firstUserId: string | null };
  let userRole: string | null = null;

  try {
    [usersPage, pendingKyc, userRole] = await Promise.all([
      listUsersWithRolesPage({
        page: requestedPage,
        search: params.search,
      }),
      getPendingKycSummary(params.search),
      getUserRole(userId),
    ]);
  } catch (err) {
    console.error("AdminUsersPage data fetch error:", err);
    return (
      <WorkspaceFrame className="mx-auto max-w-xl py-12">
        <EmptyState
          variant="page"
          icon={<Shield className="h-8 w-8 text-rust" />}
          title="Unable to load users"
          description="Couldn't load users. Check the server logs for details."
        />
      </WorkspaceFrame>
    );
  }

  if (!userRole || (userRole !== "admin" && userRole !== "manager")) {
    return (
      <WorkspaceFrame className="mx-auto max-w-xl py-12">
        <EmptyState
          variant="page"
          icon={<Shield className="h-8 w-8 text-rust" />}
          title="Access Denied"
          description="You do not have permission to access this page."
          action={
            <Button variant="ink" asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          }
        />
      </WorkspaceFrame>
    );
  }

  const users = usersPage.users;
  const kycAttentionCount = pendingKyc.count;

  return (
    <WorkspaceFrame className="mx-auto max-w-[1440px] space-y-6">
      <PageHeading
        title="Manage Users"
        subtitle="View and manage user accounts and permissions."
      />

      {kycAttentionCount > 0 && pendingKyc.firstUserId && (
        <CalloutBanner
          variant="gold"
          icon={<Shield className="mt-0.5 h-5 w-5 text-amber" />}
          title={`${kycAttentionCount} KYC submission${kycAttentionCount > 1 ? "s" : ""} require review`}
          description={`There ${kycAttentionCount === 1 ? "is" : "are"} ${kycAttentionCount} user${kycAttentionCount > 1 ? "s" : ""} with new or edited KYC submissions awaiting your attention.`}
          action={
            <Button variant="ink" size="sm" asChild>
              <Link
                href={`/dashboard/admin/users/kyc/${pendingKyc.firstUserId}`}
              >
                Review Now
              </Link>
            </Button>
          }
        />
      )}

      <Card className="border border-hairline bg-surface shadow-flat">
        <CardHeader className="border-b border-hairline pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="font-fraunces text-xl font-normal text-ink">
              Users
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <SendKycReminderButton />
              <ExportCSVButton />
              <UserSearch defaultValue={params.search} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <UsersTable
            users={users}
            currentUserRole={userRole}
            page={usersPage.page}
            pageSize={usersPage.pageSize}
            total={usersPage.total}
            totalPages={usersPage.totalPages}
          />
        </CardContent>
      </Card>
    </WorkspaceFrame>
  );
}
