import type React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { Shield, User, UserCog } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalloutBanner } from "@/components/ui/callout-banner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";
import { PageHeading } from "@/components/admin/workspace/page-heading";
import { UserSearch } from "@/components/engagement/Search";
import { CopyEmail } from "@/components/engagement/CopyEmail";
import { PaginationButton } from "@/components/engagement/PaginationButton";
import { auth } from "@/lib/auth/auth";
import {
  getUserRole,
  listUsersWithRolesPage,
  getPendingKycSummary,
} from "@/actions/admin/role-actions";
import type { UserWithRole } from "@/types";
import type { UsersWithRolesPage } from "@/actions/admin/role-actions";
import { ExportCSVButton } from "./components/export-csv-button";
import { SendKycReminderButton } from "./components/send-kyc-reminder-button";
import { UserActions } from "./user-actions";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams:
    | Promise<{ search?: string; page?: string }>
    | { search?: string; page?: string };
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
        <Card className="border border-hairline bg-surface shadow-flat">
          <CardHeader>
            <CardTitle className="font-fraunces text-xl text-ink">
              Unable to load users
            </CardTitle>
            <CardDescription className="text-ink/60">
              Couldn&apos;t load users. Check the server logs for details.
            </CardDescription>
          </CardHeader>
        </Card>
      </WorkspaceFrame>
    );
  }

  if (!userRole || (userRole !== "admin" && userRole !== "manager")) {
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
          <div className="overflow-x-auto rounded-lg border border-hairline">
            <Table>
              <TableHeader className="bg-bone">
                <TableRow className="border-b border-hairline hover:bg-transparent">
                  <TableHead className="font-semibold text-ink/70">
                    User
                  </TableHead>
                  <TableHead className="font-semibold text-ink/70">
                    Role
                  </TableHead>
                  <TableHead className="font-semibold text-ink/70">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-ink/70">
                    Joined
                  </TableHead>
                  <TableHead className="font-semibold text-ink/70">
                    KYC
                  </TableHead>
                  <TableHead className="text-right font-semibold text-ink/70">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-sm text-ink/60"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((userItem: UserWithRole) => (
                    <TableRow
                      key={userItem.id}
                      className="border-b border-hairline last:border-0 hover:bg-cream/40"
                    >
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Link
                            href={`/${userItem.username || userItem.id}`}
                            className="font-medium text-ink hover:underline"
                          >
                            {userItem.full_name || "Unnamed User"}
                          </Link>
                          <CopyEmail email={userItem.email} />
                        </div>
                      </TableCell>
                      <TableCell>
                        {userItem.role === "admin" ? (
                          <Badge variant="live" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : userItem.role === "manager" ? (
                          <Badge variant="blue" className="gap-1">
                            <UserCog className="h-3 w-3" />
                            Manager
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1 text-ink/70"
                          >
                            <User className="h-3 w-3" />
                            User
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {userItem.is_blocked ? (
                          <Badge variant="critical">Blocked</Badge>
                        ) : (
                          <Badge variant="forest">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-ink/80">
                        {format(new Date(userItem.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/admin/users/kyc/${userItem.id}`}
                          className="relative inline-block transition-opacity hover:opacity-80"
                          title="Review KYC"
                        >
                          {userItem.kyc_status === "approved" ? (
                            <Shield className="h-5 w-5 text-forest" />
                          ) : userItem.kyc_status === "rejected" ? (
                            <Shield className="h-5 w-5 text-rust" />
                          ) : userItem.kyc_status === "pending" ? (
                            <Shield className="h-5 w-5 text-gold" />
                          ) : (
                            <Shield className="h-5 w-5 text-ink/30" />
                          )}

                          {userItem.kyc_status === "pending" && (
                            <span className="absolute -right-0.5 -top-0.5 block h-2 w-2 rounded-full border border-surface bg-rust" />
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <UserActions
                          user={userItem}
                          currentUserRole={userRole}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-ink/60">
              {usersPage.total === 0
                ? "0 users"
                : `Showing ${(usersPage.page - 1) * usersPage.pageSize + 1}–${
                    (usersPage.page - 1) * usersPage.pageSize + users.length
                  } of ${usersPage.total} users`}
            </p>
            {usersPage.totalPages > 1 && (
              <PaginationButton
                currentPage={usersPage.page}
                totalPages={usersPage.totalPages}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </WorkspaceFrame>
  );
}
