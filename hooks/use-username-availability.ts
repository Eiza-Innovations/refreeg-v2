"use client";

import { useEffect, useState } from "react";
import { checkUsernameAvailability } from "@/actions/users/profile-actions";
import { usernameSchema } from "@/lib/schemas/onboarding-profile.schema";
import type { UsernameStatus } from "@/types/onboarding-types";

/** Debounced "is this handle free?" check for onboarding username fields. */
export function useUsernameAvailability(username: string, userId?: string) {
  const [status, setStatus] = useState<UsernameStatus>("idle");

  useEffect(() => {
    const handle = username.trim();
    // Do not report a handle as free when it could not be saved anyway.
    if (!usernameSchema.safeParse(handle).success) {
      setStatus("idle");
      return;
    }
    setStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(handle, userId);
        setStatus(available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username, userId]);

  return status;
}
