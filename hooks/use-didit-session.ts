"use client";

import { useMutation } from "@tanstack/react-query";

export function useDiditSession() {
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/kyc/didit/session", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to start verification session.");
      }

      const { DiditSdk } = await import("@didit-protocol/sdk-web");
      if (!DiditSdk || !data?.url) {
        throw new Error("Verification SDK could not be initialized.");
      }

      DiditSdk.shared.startVerification({
        url: data.url,
      });

      DiditSdk.shared.onComplete = (result) => {
        if (result.type === "completed") {
          window.location.assign("/dashboard/settings/kyc-setup");
        } else {
          window.location.reload();
        }
      };
    },
  });

  return {
    startVerification: mutation.mutate,
    isPending: mutation.isPending,
    errorMessage:
      mutation.error instanceof Error ? mutation.error.message : undefined,
  };
}
