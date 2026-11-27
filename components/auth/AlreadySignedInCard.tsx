"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { AlreadySignedInCardProps } from "@/types/auth-types";

export function AlreadySignedInCard({
  name,
  email,
  redirectTo,
  variant,
}: AlreadySignedInCardProps) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const handleSwitchAccount = async () => {
    setSwitching(true);
    try {
      await nextAuthSignOut({ redirect: false });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <Card variant="surface" className="p-6 text-center">
      <Eyebrow>Signed in as</Eyebrow>
      <p className="mt-2 truncate font-fraunces text-2xl text-ink">
        {name || email || "your account"}
      </p>
      {name && email ? (
        <p className="truncate text-sm text-ink/60">{email}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <Button
          variant="ink"
          onClick={() => router.push(redirectTo)}
          className="h-12 w-full rounded-md"
        >
          {variant === "signup" ? "Go to dashboard" : "Continue"}
        </Button>
        <Button
          variant="surface"
          onClick={handleSwitchAccount}
          disabled={switching}
          className="h-12 w-full rounded-md"
        >
          {switching ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Signing out...
            </span>
          ) : variant === "signup" ? (
            "Sign up with a different email"
          ) : (
            "Sign in as someone else"
          )}
        </Button>
      </div>
    </Card>
  );
}
