"use client";

import { Ban, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ModerationReportItem } from "@/lib/moderation/moderation-service";

export interface PendingModerationTarget {
  report: ModerationReportItem;
  action: "remove_content" | "block_user";
}

interface ModerationActionDialogProps {
  target: PendingModerationTarget | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ModerationActionDialog({
  target,
  isPending,
  onClose,
  onConfirm,
}: ModerationActionDialogProps) {
  const isBlock = target?.action === "block_user";

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) {
          onClose();
        }
      }}
    >
      <DialogContent className="bg-surface border-hairline">
        <DialogHeader>
          <DialogTitle className="font-fraunces text-ink">
            {isBlock
              ? "Remove content and block user?"
              : "Remove reported content?"}
          </DialogTitle>
          <DialogDescription className="text-ink/70">
            {isBlock
              ? "This will remove or hide the reported item, block the user's account, and revoke their active web and mobile sessions."
              : "This will permanently delete the comment or reject and hide the reported campaign or petition."}
          </DialogDescription>
        </DialogHeader>

        {target ? (
          <div className="space-y-2 rounded-xl border border-hairline bg-cream-muted p-3 text-xs text-ink/80">
            <p className="font-semibold uppercase tracking-wide text-ink/55">
              {target.report.targetType} · {target.report.reason}
            </p>
            {target.report.targetPreview ? (
              <p className="line-clamp-3 text-ink">
                &ldquo;{target.report.targetPreview}&rdquo;
              </p>
            ) : null}
            {isBlock && target.report.reportedUserName ? (
              <p className="text-rust font-medium">
                Account: {target.report.reportedUserName}
                {target.report.reportedUserEmail
                  ? ` (${target.report.reportedUserEmail})`
                  : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="surface"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="rust"
            onClick={onConfirm}
            disabled={isPending}
            className="gap-1.5"
          >
            {isBlock ? (
              <Ban className="h-3.5 w-3.5" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {isPending
              ? "Applying..."
              : isBlock
                ? "Confirm Block User"
                : "Confirm Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
