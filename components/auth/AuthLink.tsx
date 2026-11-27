import type { ComponentProps } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** An inline text link in auth copy: blue accent, underlined on hover. */
export function AuthLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "font-semibold text-blue-accent hover:underline",
        className,
      )}
      {...props}
    />
  );
}
