"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { PaginationButton } from "@/components/engagement/PaginationButton";
import { createUsersColumns } from "./columns";
import type { UserWithRole } from "@/types";

interface UsersTableProps {
  users: UserWithRole[];
  currentUserRole: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function UsersTable({
  users,
  currentUserRole,
  page,
  pageSize,
  total,
  totalPages,
}: UsersTableProps) {
  const columns = useMemo(
    () => createUsersColumns(currentUserRole),
    [currentUserRole],
  );

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-hairline">
        <DataTable columns={columns} data={users} />
      </div>
      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-xs text-ink/60">
          {total === 0
            ? "0 users"
            : `Showing ${(page - 1) * pageSize + 1}–${
                (page - 1) * pageSize + users.length
              } of ${total} users`}
        </p>
        {totalPages > 1 && (
          <PaginationButton currentPage={page} totalPages={totalPages} />
        )}
      </div>
    </div>
  );
}
