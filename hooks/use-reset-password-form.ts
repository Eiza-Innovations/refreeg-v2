"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useValidator } from "@/hooks/use-validator";
import {
  requestResetSchema,
  type RequestResetFields,
} from "@/lib/schemas/password-reset.schema";

/** Email field, validation and the "send reset link" call for /auth/reset-password. */
export function useResetPasswordForm() {
  const { resetPassword } = useAuth();
  const [form, setForm] = useState<RequestResetFields>({ email: "" });
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: requestResetSchema,
  });

  const sendLink = useMutation({
    mutationFn: () => resetPassword(form.email.trim().toLowerCase()),
  });

  const setEmail = (email: string) => {
    if (sendLink.isError) sendLink.reset();
    setForm({ email });
    clearError("email");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (sendLink.isPending || !validate()) return;
    sendLink.mutate();
  };

  return {
    email: form.email,
    setEmail,
    emailError: errors.email,
    submitError: sendLink.error?.message ?? null,
    isSending: sendLink.isPending,
    isSent: sendLink.isSuccess,
    handleSubmit,
    tryAnotherEmail: sendLink.reset,
  };
}
