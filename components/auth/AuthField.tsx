"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AuthFieldProps } from "@/types/auth-types";

/**
 * Labelled auth input with an inline error. Password fields get their own
 * show/hide toggle.
 */
export function AuthField({
  id,
  label,
  error,
  labelAction,
  type,
  className,
  ...inputProps
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  const input = (
    <Input
      id={id}
      type={isPassword && revealed ? "text" : type}
      aria-invalid={!!error}
      className={cn(
        // The global input:focus rule forces a navy border; this field uses the accent blue.
        "h-12 rounded-md border-transparent bg-cream-muted px-4 text-sm text-ink shadow-none placeholder:text-ink/40 focus-visible:ring-0 focus:!border-blue-accent focus:!shadow-[0_0_0_3px_hsl(var(--blue-accent)/0.15)]",
        isPassword && "pr-11",
        error && "border-rust bg-rust/5",
        className,
      )}
      {...inputProps}
    />
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="label-eyebrow">
          {label}
        </Label>
        {labelAction}
      </div>
      {isPassword ? (
        <div className="relative">
          {input}
          <Button
            type="button"
            variant="bare"
            size="bare"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute bottom-0 right-0 top-0 flex items-center px-3.5 text-ink/40 hover:text-ink"
          >
            {revealed ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      ) : (
        input
      )}
      <FieldError message={error} />
    </div>
  );
}
