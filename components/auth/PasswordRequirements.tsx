import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPasswordErrors,
  PASSWORD_REQUIREMENTS,
} from "@/lib/auth/registration";
import type { PasswordRequirementsProps } from "@/types/auth-types";

/** The password rules as a checklist that ticks off as the person types. */
export function PasswordRequirements({
  password,
  className,
}: PasswordRequirementsProps) {
  const unmet = new Set(getPasswordErrors(password));

  return (
    <ul
      aria-label="Password requirements"
      className={cn("grid gap-1.5 text-xs sm:grid-cols-2", className)}
    >
      {PASSWORD_REQUIREMENTS.map((rule) => {
        const met = password.length > 0 && !unmet.has(rule);
        return (
          <li
            key={rule}
            className={cn(
              "flex items-center gap-2",
              met ? "text-forest" : "text-ink/60",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                met ? "border-forest bg-forest text-white" : "border-ink/25",
              )}
            >
              {met ? <Check className="h-2.5 w-2.5" /> : null}
            </span>
            {rule}
            <span className="sr-only">{met ? " (met)" : " (not met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
