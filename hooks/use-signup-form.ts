"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { useAuth } from "@/hooks/use-auth";
import { useSocialSignIn } from "@/hooks/use-social-sign-in";
import { useValidator } from "@/hooks/use-validator";
import { toast } from "@/hooks/use-toast";
import { safeRedirect } from "@/lib/auth/safe-redirect";
import { normalizeRegistrationInput } from "@/lib/auth/registration";
import type { SignupAccountType } from "@/lib/auth/registration";
import {
  signupSchema,
  type SignupFields,
} from "@/lib/schemas/registration.schema";
import type { SignupCopy, SignupTracking } from "@/types/auth-types";

export function useSignupForm(copy: SignupCopy) {
  const router = useRouter();
  const { user } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: true,
  });
  const [termsRejected, setTermsRejected] = useState(false);
  const [tracking, setTracking] = useState<SignupTracking>({
    referralCode: null,
    redirect: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
  });
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: signupSchema,
  });

  // Read once. `router` changes identity on every render, so keeping this
  // effect free of it stops the state update from looping.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    // "Change email" on the code page links back here with the address typed.
    const email = params.get("email");
    if (email) setForm((current) => ({ ...current, email }));
    setTracking({
      referralCode: params.get("ref_v1") || null,
      redirect: safeRedirect(redirect),
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
    });
  }, []);

  useEffect(() => {
    router.prefetch("/auth/verify-otp");
    router.prefetch(copy.prefetchPath);
  }, [router, copy.prefetchPath]);

  const setFormFields = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    if (register.isError) register.reset();
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "agreeTerms") setTermsRejected(false);
    else clearError(key as keyof SignupFields);
  };

  const { google } = useSocialSignIn(tracking.redirect, () => {
    if (copy.markOrganizationIntent) {
      document.cookie =
        "auth_org_intent=true; path=/; max-age=600; SameSite=Lax";
    }
  });

  const register = useMutation({
    mutationFn: async (
      registration: ReturnType<typeof normalizeRegistrationInput>,
    ) => {
      const response = await fetch("/api/auth/register-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registration,
          confirmPassword: undefined,
          referralCode: tracking.referralCode,
          utm_source: tracking.utmSource,
          utm_medium: tracking.utmMedium,
          utm_campaign: tracking.utmCampaign,
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? response.statusText);
      return registration;
    },
    onSuccess: (registration) => {
      toast({
        title: "Check your email!",
        description: copy.codeSentDescription,
      });
      const redirectParam = tracking.redirect
        ? `&redirect=${encodeURIComponent(tracking.redirect)}`
        : "";
      router.push(
        `/auth/verify-otp?email=${encodeURIComponent(registration.email)}${redirectParam}`,
      );
    },
  });

  const loadingType = register.isPending
    ? "manual"
    : google.isPending
      ? "google"
      : null;

  const handleGoogleSignIn = () => {
    if (!loadingType) google.mutate();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (loadingType) return;

    // Run both so every problem shows at once, each under its own field.
    const fieldsValid = validate();
    setTermsRejected(!form.agreeTerms);
    if (!fieldsValid || !form.agreeTerms) return;

    const registration = normalizeRegistrationInput({
      accountType: copy.accountType,
      email: form.email,
      password: form.password,
      confirmPassword: form.confirmPassword,
    });

    toast(copy.creating);
    register.mutate(registration);
  };

  return {
    user,
    form,
    setFormFields,
    errors,
    termsError: termsRejected
      ? "Accept the terms and privacy policy to continue."
      : undefined,
    submitError: register.error?.message ?? null,
    loadingType,
    redirect: tracking.redirect,
    handleGoogleSignIn,
    handleSubmit,
  };
}
