"use client";

import { useFormStatus } from "react-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function KycApproveButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="ink"
      className="w-full"
      aria-label="Approve KYC"
      disabled={disabled || pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Approving...
        </>
      ) : (
        <>
          <CheckCircle className="mr-2 h-4 w-4" />
          Approve identity
        </>
      )}
    </Button>
  );
}
