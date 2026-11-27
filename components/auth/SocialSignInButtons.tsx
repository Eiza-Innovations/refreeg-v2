"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SocialSignInButtonsProps } from "@/types/auth-types";

const socialButtonClass = "h-12 w-full gap-3 rounded-md text-sm font-medium";

export function SocialSignInButtons({
  disabled,
  googleLoading,
  onGoogle,
}: SocialSignInButtonsProps) {
  return (
    <div className="space-y-3 mb-6">
      <Button
        type="button"
        variant="surface"
        onClick={onGoogle}
        disabled={disabled}
        className={socialButtonClass}
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-ink" />
        ) : (
          <>
            <Image
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              width={18}
              height={18}
              alt="Google"
              className="shrink-0"
            />
            <span>Continue with Google</span>
          </>
        )}
      </Button>
    </div>
  );
}
