"use client";

import { P } from "@/components/marketing/Typography";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WorkItem } from "./types";

export function CampaignDialog({
  campaign,
  onClose,
}: {
  campaign: WorkItem | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!campaign} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-surface text-ink">
        <DialogHeader>
          <DialogTitle>{campaign?.name}</DialogTitle>
          <DialogDescription>Created by {campaign?.detail}</DialogDescription>
        </DialogHeader>
        <P className="capitalize">Status: {campaign?.status}</P>
        {campaign?.href && (
          <a
            href={campaign.href}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold underline"
          >
            Open campaign page
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
