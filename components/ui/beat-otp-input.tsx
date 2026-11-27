"use client";

import * as React from "react";
import { OTPInput } from "input-otp";
import { AlertCircle, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BeatOtpInputProps } from "@/types/auth-types";

export function BeatOtpInput({
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
  placeholder = "000000",
  className,
  id = "otp-input",
  name = "otp",
  showHelper = true,
  onPasteSuccess,
}: BeatOtpInputProps) {
  const inputRef = React.useRef<React.ElementRef<typeof OTPInput>>(null);

  // The field is disabled while a code is being checked, which drops focus;
  // take it back when it is usable again so a retry can be typed straight away.
  React.useEffect(() => {
    if (!disabled && autoFocus) inputRef.current?.focus();
  }, [disabled, autoFocus]);

  const cleanPlaceholder = (placeholder.replace(/\D/g, "") + "••••••").slice(
    0,
    6,
  );

  const handlePasteClick = async () => {
    if (disabled) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        const cleaned = text.replace(/\D/g, "").slice(0, 6);
        if (cleaned) {
          onChange(cleaned);
          if (cleaned.length === 6 && onComplete) {
            onComplete(cleaned);
          }
          onPasteSuccess?.();
        }
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  return (
    <div className={cn("w-full space-y-2.5", className)}>
      <div className="relative w-full">
        <OTPInput
          ref={inputRef}
          id={id}
          name={name}
          aria-label="6-digit verification code"
          maxLength={6}
          value={value}
          onChange={onChange}
          onComplete={onComplete}
          disabled={disabled}
          autoFocus={autoFocus}
          pattern="^[0-9]+$"
          inputMode="numeric"
          autoComplete="one-time-code"
          containerClassName="w-full flex justify-center"
          // The global input:focus rule paints inputs white; this one is an
          // invisible overlay on top of the slots.
          className="disabled:cursor-not-allowed focus:!bg-transparent focus:!text-transparent"
          render={({ slots }) => {
            // A slot is active only while the hidden input has focus.
            const isFocused = slots.some((slot) => slot.isActive);
            return (
              <div
                onClick={() => inputRef.current?.focus()}
                className={cn(
                  "relative flex h-16 w-full cursor-text select-none items-center justify-center rounded-md border-2 px-4 transition-all duration-200 sm:h-20 sm:px-8",
                  error
                    ? "border-rust bg-rust/5 text-rust"
                    : isFocused
                      ? "border-blue-accent bg-surface text-ink ring-4 ring-blue-accent/15"
                      : value.length > 0
                        ? "border-hairline bg-surface text-ink"
                        : "border-transparent bg-cream-muted text-ink/25",
                  disabled && "opacity-50 cursor-not-allowed",
                )}
              >
                {}
                <div className="flex items-center gap-2 sm:gap-4">
                  {slots.slice(0, 3).map((slot, index) => (
                    <SlotView
                      key={index}
                      slot={slot}
                      placeholderChar={cleanPlaceholder[index]}
                      isFocused={isFocused}
                      hasValue={value.length > 0}
                      hasError={Boolean(error)}
                      disabled={disabled}
                    />
                  ))}
                </div>

                {}
                <span
                  className={cn(
                    "mx-3 sm:mx-6 text-xl sm:text-3xl font-light select-none transition-colors",
                    error
                      ? "text-rust/50"
                      : isFocused
                        ? "text-ink/40"
                        : value.length > 0
                          ? "text-ink/30"
                          : "text-ink/25",
                  )}
                  aria-hidden="true"
                >
                  -
                </span>

                {}
                <div className="flex items-center gap-2 sm:gap-4">
                  {slots.slice(3, 6).map((slot, index) => (
                    <SlotView
                      key={index + 3}
                      slot={slot}
                      placeholderChar={cleanPlaceholder[index + 3]}
                      isFocused={isFocused}
                      hasValue={value.length > 0}
                      hasError={Boolean(error)}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            );
          }}
        />
      </div>

      {}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-rust animate-in fade-in-50 duration-200 sm:text-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {}
      {showHelper && (
        <div className="flex items-center justify-between pt-0.5 text-xs text-ink/60 sm:text-sm">
          <span>Six digits.</span>
          <Button
            type="button"
            variant="bare"
            size="bare"
            onClick={handlePasteClick}
            disabled={disabled}
            className="gap-1 font-medium text-blue-accent hover:underline disabled:opacity-50"
          >
            <Clipboard className="h-3.5 w-3.5" />
            Paste
          </Button>
        </div>
      )}
    </div>
  );
}

function SlotView({
  slot,
  placeholderChar,
  isFocused,
  hasValue,
  hasError,
  disabled,
}: {
  slot: { char: string | null; isActive: boolean; hasFakeCaret: boolean };
  placeholderChar: string;
  isFocused: boolean;
  hasValue: boolean;
  hasError: boolean;
  disabled: boolean;
}) {
  return (
    <div className="relative flex items-center justify-center w-7 sm:w-10 h-10 sm:h-12 text-2xl sm:text-3xl font-bold font-mono uppercase">
      {slot.char ? (
        <span className={cn(hasError ? "text-rust" : "text-ink")}>
          {slot.char}
        </span>
      ) : (
        <span
          className={cn(
            "transition-opacity select-none",
            hasError
              ? "text-rust/40"
              : isFocused || hasValue
                ? "text-ink/20"
                : "text-ink/25",
          )}
        >
          {placeholderChar}
        </span>
      )}

      {}
      {slot.hasFakeCaret && !disabled && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "h-6 sm:h-8 w-[2px] animate-caret-blink duration-1000",
              hasError ? "bg-rust" : "bg-blue-accent",
            )}
          />
        </div>
      )}
    </div>
  );
}
