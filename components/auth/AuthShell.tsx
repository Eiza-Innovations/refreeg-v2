import type { ReactNode } from "react";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { AuthLogo } from "@/components/auth/AuthLogo";
import type { AuthShellProps } from "@/types/auth-types";

/** Ink brand panel on the left, the white form column on the right, logo on small screens. */
export function AuthShell({ brand, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-surface">
      <AuthBrandPanel {...brand} />
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <AuthLogo variant="dark" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
