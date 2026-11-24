"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/hooks/use-toast";
import { reviewOrganizationVerification } from "@/actions/admin/admin-organization-actions";
import type { OrganizationVerificationRow } from "@/types/organization-types";
import { verificationColumns } from "./columns";
import { RejectionDialog } from "./rejection-dialog";

export function VerificationReviewClient({
  initialSubmissions,
}: {
  initialSubmissions: OrganizationVerificationRow[];
}) {
  const [submissions, setSubmissions] =
    useState<OrganizationVerificationRow[]>(initialSubmissions);
  const [rejecting, setRejecting] =
    useState<OrganizationVerificationRow | null>(null);

  const reviewMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      decision: "approve" | "reject";
      note?: string;
    }) => {
      const result = await reviewOrganizationVerification(input);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_data, variables) => {
      setSubmissions((prev) => prev.filter((row) => row.id !== variables.id));
      toast({
        title:
          variables.decision === "approve"
            ? "Organisation verified"
            : "Submission rejected",
      });
    },
    onError: (error) =>
      toast({
        title: "Review failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      }),
  });

  const columns = useMemo(
    () =>
      verificationColumns((id, decision) => {
        if (decision === "reject") {
          const row = submissions.find((item) => item.id === id);
          if (row) setRejecting(row);
          return;
        }
        reviewMutation.mutate({ id, decision: "approve" });
      }),
    [submissions, reviewMutation],
  );

  if (!submissions.length) {
    return (
      <EmptyState
        title="No submissions waiting"
        description="Organisation verification submissions appear here when organisations upload their registration documents."
      />
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={submissions}
        pageSize={10}
        pagination
      />
      <RejectionDialog
        submission={rejecting}
        onClose={() => setRejecting(null)}
        onConfirm={(note) => {
          if (!rejecting) return;
          reviewMutation.mutate({
            id: rejecting.id,
            decision: "reject",
            note,
          });
          setRejecting(null);
        }}
      />
    </>
  );
}
