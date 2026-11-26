"use client";

import { useState } from "react";
import type { z } from "zod";

type FieldErrors<T extends z.ZodTypeAny> = Partial<
  Record<keyof z.infer<T> & string, string>
>;

/**
 * Validates one form-state object against a zod schema and keeps the first
 * message per field. `validate()` returns true when the store is valid; pass
 * `only` to check and show errors for just those fields.
 */
export function useValidator<T extends z.ZodTypeAny>({
  store,
  schema,
}: {
  store: unknown;
  schema: T;
}) {
  const [errors, setErrors] = useState<FieldErrors<T>>({});

  const validate = (only?: readonly string[]) => {
    const result = schema.safeParse(store);
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (!key || next[key]) continue;
      if (only && !only.includes(key)) continue;
      next[key] = issue.message;
    }
    setErrors(next as FieldErrors<T>);
    return only ? Object.keys(next).length === 0 : false;
  };

  const clearError = (key: keyof FieldErrors<T>) =>
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  /** Inline, schema-less messages (bounds that depend on runtime data). */
  const setError = (key: keyof FieldErrors<T>, message: string) =>
    setErrors((current) => ({ ...current, [key]: message }));

  return { errors, validate, clearError, setError };
}
