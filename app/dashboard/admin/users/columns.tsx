"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Shield, User, UserCog } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { DataTableFeatures } from "@/components/ui/data-table-features";
import { Span } from "@/components/marketing/Typography";
import { CopyEmail } from "@/components/engagement/CopyEmail";
import { UserActions } from "./user-actions";
import type { UserWithRole } from "@/types";

const columnHelper = createColumnHelper<DataTableFeatures, UserWithRole>();

export function createUsersColumns(currentUserRole: string) {
  return columnHelper.columns([
    columnHelper.display({
      id: "user",
      header: "User",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <Link
            href={`/${row.original.username || row.original.id}`}
            className="font-medium text-ink hover:underline"
          >
            {row.original.full_name || "Unnamed User"}
          </Link>
          <CopyEmail email={row.original.email} />
        </div>
      ),
    }),
    columnHelper.accessor("role", {
      header: "Role",
      cell: ({ row }) => {
        const role = row.original.role;
        if (role === "admin") {
          return (
            <Badge variant="live" className="gap-1">
              <Shield className="h-3 w-3" />
              Admin
            </Badge>
          );
        }
        if (role === "manager") {
          return (
            <Badge variant="blue" className="gap-1">
              <UserCog className="h-3 w-3" />
              Manager
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="gap-1 text-ink/70">
            <User className="h-3 w-3" />
            User
          </Badge>
        );
      },
    }),
    columnHelper.accessor("is_blocked", {
      header: "Status",
      cell: ({ row }) =>
        row.original.is_blocked ? (
          <Badge variant="critical">Blocked</Badge>
        ) : (
          <Badge variant="forest">Active</Badge>
        ),
    }),
    columnHelper.accessor("created_at", {
      header: "Joined",
      cell: ({ row }) => (
        <Span className="text-sm text-ink/80">
          {format(new Date(row.original.created_at), "MMM d, yyyy")}
        </Span>
      ),
    }),
    columnHelper.display({
      id: "kyc",
      header: "KYC",
      cell: ({ row }) => {
        const kyc = row.original.kyc_status;
        return (
          <Link
            href={`/dashboard/admin/users/kyc/${row.original.id}`}
            className="relative inline-block transition-opacity hover:opacity-80"
            title="Review KYC"
          >
            {kyc === "approved" ? (
              <Shield className="h-5 w-5 text-forest" />
            ) : kyc === "rejected" ? (
              <Shield className="h-5 w-5 text-rust" />
            ) : kyc === "pending" ? (
              <Shield className="h-5 w-5 text-gold" />
            ) : (
              <Shield className="h-5 w-5 text-ink/30" />
            )}
            {kyc === "pending" && (
              <span className="absolute -right-0.5 -top-0.5 block h-2 w-2 rounded-full border border-surface bg-rust" />
            )}
          </Link>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <UserActions user={row.original} currentUserRole={currentUserRole} />
        </div>
      ),
    }),
  ]);
}
