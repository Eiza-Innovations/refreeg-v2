"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { decideBounty } from "@/actions/admin/admin-bounty-actions";
import { toast } from "@/hooks/use-toast";

export function useBountyDecision() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: decideBounty,
    onSuccess: () => router.refresh(),
    onError: (error: Error) => {
      toast({
        title: "Couldn't send decision",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    decide: mutation.mutate,
    isPending: mutation.isPending,
  };
}
