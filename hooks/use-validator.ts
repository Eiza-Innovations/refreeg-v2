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
export function useValidator<
  T extends z.ZodTypeAny,
  E extends object = FieldErrors<T>,
>({
  store,
  schema,
  mapErrors,
}: {
  store: unknown;
  schema: T;
  mapErrors?: (issues: z.ZodIssue[], only?: readonly string[]) => E;
}) {
  const [errors, setErrors] = useState<E>({} as E);

  const getErrors = (only?: readonly string[]): E => {
    const result = schema.safeParse(store);

    if (result.success) return {} as E;
    if (mapErrors) return mapErrors(result.error.issues, only);

    const next: Record<string, string> = {};

    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");

      if (!key || next[key]) continue;
      if (only && !only.includes(key)) continue;

      next[key] = issue.message;
    }

    return next as E;
  };

  const validate = (only?: readonly string[]) => {
    const next = getErrors(only);
    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const clearError = (key: keyof E) =>
    setErrors((current) => {
      if (!current[key]) return current;

      const next = { ...current };
      delete next[key];

      return next;
    });

  /**
   * Inline, schema-less messages for constraints that depend on runtime data.
   */
  const setError = (key: keyof FieldErrors<T>, message: string) =>
    setErrors((current) => ({ ...current, [key]: message }));

  return {
    errors,
    setErrors,
    getErrors,
    validate,
    clearError,
    setError,
  };
}
