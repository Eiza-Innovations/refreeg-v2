"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { deleteUserAccount } from "@/actions/users/user-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { DATA_RETENTION_POLICY } from "@/lib/config/retention";

interface DeleteAccountButtonProps {
  userId: string;
}

export function DeleteAccountButton({ userId }: DeleteAccountButtonProps) {
  const [open, setOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteUserAccount(userId),
    onSuccess: async ({ error: deleteError }) => {
      if (deleteError) {
        setOpen(false);
        toast({
          title: "Cannot Delete Account",
          description: deleteError,
          variant: "destructive",
        });
        return;
      }

      setOpen(false);
      toast({
        title: "Account Deleted",
        description:
          "Your account and personal data have been permanently deleted.",
      });
      await signOut({ redirect: false });
      window.location.assign("/");
    },
    onError: (mutationError: Error) => {
      setOpen(false);
      toast({
        title: "Cannot Delete Account",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });

  const errorMessage =
    deleteMutation.data?.error ??
    (deleteMutation.error instanceof Error
      ? deleteMutation.error.message
      : null);

  const handleConfirmDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (deleteMutation.isPending) return;
    deleteMutation.mutate();
  };

  return (
    <Card variant="surface" className="border-rust/40 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-fraunces text-rust">
          <Trash2 className="h-5 w-5" />
          Delete Account
        </CardTitle>
        <CardDescription className="text-ink/65">
          Permanently delete your account and personal data. This action cannot
          be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This action will permanently delete your account and personal data,
            including:
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Your profile information, photos, and social links</li>
              <li>KYC verification documents and Didit liveness session</li>
              <li>Saved bank details, device tokens, and unfunded campaigns</li>
            </ul>
            <p className="mt-2 text-xs">
              Completed financial transaction records (donations, pledges, and
              crypto settlements) are anonymized (&ldquo;
              {DATA_RETENTION_POLICY.DELETED_ACCOUNT_DISPLAY_NAME}&rdquo;) and
              retained without personal identifiers for{" "}
              {DATA_RETENTION_POLICY.FINANCIAL_RECORDS_RETENTION_YEARS} years to
              comply with financial and tax audit regulations. Active campaigns
              that have raised funds must be paused or closed before account
              deletion.
            </p>
          </AlertDescription>
        </Alert>

        {errorMessage ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <AlertDialog
          open={open}
          onOpenChange={(next) => {
            if (!deleteMutation.isPending) setOpen(next);
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="rust" disabled={deleteMutation.isPending}>
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteMutation.isPending ? "Deleting..." : "Delete Account"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-surface border-hairline">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-fraunces text-ink">
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-ink/70">
                This action cannot be undone. Your personal data, KYC documents,
                and credentials will be permanently deleted, and historical
                financial records will be anonymized.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-rust text-rust-foreground hover:bg-rust/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending
                  ? "Deleting..."
                  : "Yes, delete my account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
