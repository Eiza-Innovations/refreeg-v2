"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  allocatePartnerCreditsAction,
  approvePartnerCreditRequestAction,
  getAdminPartnerCreditsDashboard,
  getPartnerCreditsDashboard,
  onboardPartnerAction,
  rejectPartnerCreditRequestAction,
  requestPartnerTopUpAction,
  updatePartnerAccountAction,
} from "@/actions/partners/partner-credit-actions";
import type {
  AdminPartnerCreditsDashboardData,
  PartnerActionResult,
  PartnerCreditsDashboardData,
  PartnerCreditTransactionItem,
} from "@/types/partner-credit-types";

export const adminPartnerCreditsKey = ["admin-partner-credits"] as const;
export const partnerCreditsKey = ["partner-credits"] as const;

export function formatNairaCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return `₦${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}b`;
  }
  if (abs >= 1_000_000) {
    return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  }
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function formatNairaFull(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function escapeCsvCell(raw: string): string {
  // Keep pure negative numeric literals intact while neutralizing formula prefixes (=, +, -, @, whitespace/newlines).
  const isPureNumber = /^-?\d+(?:\.\d+)?$/.test(raw.trim());
  const normalized = raw.replace(/\r?\n/g, " ");
  const safe =
    !isPureNumber && /^\s*[=+\-@\t]/.test(normalized)
      ? `'${normalized}`
      : normalized;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function downloadPartnerStatementCsv(
  partnerName: string,
  transactions: readonly PartnerCreditTransactionItem[],
) {
  const header = ["Date", "Activity", "Campaign", "Credits (NGN)", "Notes"];
  const rows = transactions.map((tx) => {
    const label =
      tx.type === "initial_grant"
        ? "Initial grant approved"
        : tx.type === "top_up"
          ? "Top up approved"
          : tx.type === "employee_match"
            ? "Employee matching"
            : tx.type === "adjustment"
              ? "Adjustment"
              : "Allocated";
    const dateStr = new Date(tx.createdAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return [
      dateStr,
      label,
      tx.causeTitle || "—",
      String(tx.amount),
      tx.note || "",
    ]
      .map(escapeCsvCell)
      .join(",");
  });

  const csv = [header.map(escapeCsvCell).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const slug = partnerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug || "partner"}-credits-statement.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useAdminPartnerCredits(
  initialData: AdminPartnerCreditsDashboardData,
) {
  return useQuery({
    queryKey: adminPartnerCreditsKey,
    queryFn: async () => {
      const res = await getAdminPartnerCreditsDashboard();
      if (!res.success || !res.data) {
        throw new Error(res.success ? "Failed to load partners." : res.error);
      }
      return res.data;
    },
    initialData,
  });
}

export function usePartnerCredits(initialData: PartnerCreditsDashboardData) {
  return useQuery({
    queryKey: partnerCreditsKey,
    queryFn: async () => {
      const res = await getPartnerCreditsDashboard();
      if (!res.success || !res.data) {
        throw new Error(
          res.success ? "Failed to load partner credits." : res.error,
        );
      }
      return res.data;
    },
    initialData,
  });
}

export function usePartnerCreditMutations() {
  const queryClient = useQueryClient();

  const invalidateOnSuccess = <T>(res: PartnerActionResult<T>) => {
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: adminPartnerCreditsKey });
      queryClient.invalidateQueries({ queryKey: partnerCreditsKey });
    }
  };

  const onboardPartner = useMutation({
    mutationFn: onboardPartnerAction,
    onSuccess: invalidateOnSuccess,
  });

  const approveRequest = useMutation({
    mutationFn: approvePartnerCreditRequestAction,
    onSuccess: invalidateOnSuccess,
  });

  const rejectRequest = useMutation({
    mutationFn: ({
      requestId,
      reason,
    }: {
      requestId: string;
      reason?: string;
    }) => rejectPartnerCreditRequestAction(requestId, reason),
    onSuccess: invalidateOnSuccess,
  });

  const updatePartner = useMutation({
    mutationFn: ({ partnerId, input }: { partnerId: string; input: unknown }) =>
      updatePartnerAccountAction(partnerId, input),
    onSuccess: invalidateOnSuccess,
  });

  const allocateCredits = useMutation({
    mutationFn: allocatePartnerCreditsAction,
    onSuccess: invalidateOnSuccess,
  });

  const requestTopUp = useMutation({
    mutationFn: requestPartnerTopUpAction,
    onSuccess: invalidateOnSuccess,
  });

  return {
    onboardPartner,
    approveRequest,
    rejectRequest,
    updatePartner,
    allocateCredits,
    requestTopUp,
  };
}
