"use client";

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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeleteBountyDialog({
  bountyTitle,
  onDelete,
}: {
  bountyTitle: string;
  onDelete: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger className={buttonVariants({ variant: "surface" })}>
        Delete bounty
      </AlertDialogTrigger>
      <AlertDialogContent className="border-hairline bg-surface">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-fraunces text-2xl text-ink">
            Delete this bounty?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-ink/60">
            “{bountyTitle}” will be permanently deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep bounty</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className={cn(buttonVariants({ variant: "rust" }))}
          >
            Delete bounty
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
