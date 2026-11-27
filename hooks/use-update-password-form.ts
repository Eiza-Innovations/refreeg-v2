"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useValidator } from "@/hooks/use-validator";
import {
  newPasswordSchema,
  type NewPasswordFields,
} from "@/lib/schemas/password-reset.schema";

/** Form state, validation and the save call for /auth/update-password. */
export function useUpdatePasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const flow = searchParams.get("flow");
  const email = searchParams.get("email");
  const redirect = searchParams.get("redirect");
  const { updatePassword } = useAuth();

  const [form, setForm] = useState<NewPasswordFields>({
    password: "",
    confirmPassword: "",
  });
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: newPasswordSchema,
  });

  const save = useMutation({
    mutationFn: () =>
      updatePassword(form.password, token!, { flow, email, redirect }),
  });

  const setFormFields = <K extends keyof NewPasswordFields>(
    key: K,
    value: NewPasswordFields[K],
  ) => {
    if (save.isError) save.reset();
    setForm((current) => ({ ...current, [key]: value }));
    clearError(key);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!token || save.isPending || !validate()) return;
    save.mutate();
  };

  return {
    hasToken: !!token,
    isCauseProfileFlow: flow === "cause-profile",
    form,
    setFormFields,
    errors,
    submitError: save.error?.message ?? null,
    isSaving: save.isPending,
    handleSubmit,
  };
}
