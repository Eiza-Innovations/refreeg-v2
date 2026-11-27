"use client";

import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

/**
 * The Google button shared by the sign-in and sign-up forms.
 * `beforeGoogle` runs just before the redirect, e.g. to set a cookie.
 */
export function useSocialSignIn(
  redirect: string | null,
  beforeGoogle?: () => void,
) {
  const { signInWithGoogle } = useAuth();

  const google = useMutation({
    mutationFn: () => {
      beforeGoogle?.();
      return signInWithGoogle(redirect);
    },
    onError: (error) =>
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      }),
  });

  return { google };
}
