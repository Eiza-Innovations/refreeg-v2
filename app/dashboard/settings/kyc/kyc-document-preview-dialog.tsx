"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import type { KycDocumentPreviewDialogProps } from "@/types/kyc-types";

export function KycDocumentPreviewDialog({
  open,
  onOpenChange,
  documentUrl,
}: KycDocumentPreviewDialogProps) {
  const resolvedUrl = getMediaUrl(documentUrl) || "/icons/placeholder.svg";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Verification document</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-hairline bg-bone">
          <Image
            src={resolvedUrl}
            alt="Verification document full preview"
            fill
            className="object-contain"
            unoptimized={isProxyMediaUrl(resolvedUrl)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
