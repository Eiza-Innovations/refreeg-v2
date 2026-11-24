"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RejectionDialogProps {
  submission: { organizationName: string } | null;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

export function RejectionDialog({
  submission,
  onClose,
  onConfirm,
}: RejectionDialogProps) {
  const [note, setNote] = useState("");

  return (
    <AlertDialog
      open={!!submission}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Reject {submission?.organizationName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The organisation will be asked to upload their documents again. Add
            a note so they know what to fix.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Label htmlFor="rejection-note">
          Note for the organisation (optional)
        </Label>
        <Textarea
          id="rejection-note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rust text-white hover:bg-rust/90"
            onClick={() => onConfirm(note)}
          >
            Reject submission
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
