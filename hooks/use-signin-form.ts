"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { useSocialSignIn } from "@/hooks/use-social-sign-in";
import { useValidator } from "@/hooks/use-validator";
import { signinSchema, type SigninFields } from "@/lib/schemas/signin.schema";

/** Form state, validation and the email and Google sign-in calls for /auth/signin. */
export function useSigninForm(redirectTo: string | null) {
  const { user, isLoading, signIn } = useAuth();
  const { google } = useSocialSignIn(redirectTo);
  const [form, setForm] = useState<SigninFields>({ email: "", password: "" });
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: signinSchema,
  });

  const emailSignIn = useMutation({
    mutationFn: () =>
      signIn(form.email.trim().toLowerCase(), form.password, redirectTo),
    onError: (error) =>
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      }),
  });
  const loadingType = emailSignIn.isPending
    ? "manual"
    : google.isPending
      ? "google"
      : null;

  const setFormFields = <K extends keyof SigninFields>(
    key: K,
    value: SigninFields[K],
  ) => {
    if (emailSignIn.isError) emailSignIn.reset();
    setForm((current) => ({ ...current, [key]: value }));
    clearError(key);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (loadingType || !validate()) return;
    emailSignIn.mutate();
  };

  const handleGoogleSignIn = () => {
    if (!loadingType) google.mutate();
  };

  return {
    user,
    isLoading,
    form,
    setFormFields,
    errors,
    submitError: emailSignIn.error?.message ?? null,
    loadingType,
    handleSubmit,
    handleGoogleSignIn,
  };
}
