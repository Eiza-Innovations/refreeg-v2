"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "nextjs-toploader/app";
import type { VerifyOtpOptions } from "@/types/auth-types";

const RESEND_COOLDOWN_SECONDS = 60;

/** Server messages meaning this sign-up can no longer be finished with a code. */
const RESTART_REQUIRED =
  /sign up again|invalid or expired verification request/i;

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? response.statusText);
  return data;
}

/** Code entry, verify, resend and cooldown for the verify-otp page. */
export function useVerifyOtp({ email, redirect }: VerifyOtpOptions) {
  const router = useRouter();
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const signinUrl = () =>
    `/auth/signin?email=${encodeURIComponent(email)}&verified=true${
      redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""
    }`;

  useEffect(() => {
    if (!email) router.push("/auth/signup");
  }, [email, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = useMutation({
    mutationFn: async (code: string) => {
      const data = await postJson("/api/auth/verify-otp", {
        email,
        otpCode: code,
      });
      toast.success("Account verified successfully!");
      if (!data.loginToken) return router.push(signinUrl());

      const login = await signIn("otp-login", {
        email,
        token: data.loginToken,
        redirect: false,
      });
      if (login?.error) {
        toast.error("Auto-login failed, please sign in manually.");
        return router.push(signinUrl());
      }
      router.push(
        redirect
          ? `/onboarding?redirect=${encodeURIComponent(redirect)}`
          : "/onboarding",
      );
    },
    // The message shows inline under the field. Clear the rejected code so the
    // next one is typed or pasted into an empty field.
    onError: () => setOtpCode(""),
  });

  const resend = useMutation({
    mutationFn: () => postJson("/api/auth/resend-otp", { email }),
    onSuccess: () => {
      toast.success("A new code has been sent to your email.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    },
    // A failed resend shows inline, in the same place as a rejected code.
  });

  const changeCode = (value: string) => {
    setOtpCode(value);
    verify.reset();
    resend.reset();
  };

  const submitCode = (code: string) => {
    if (code.length === 6 && !verify.isPending) verify.mutate(code);
  };

  const resendCode = () => {
    if (cooldown === 0 && !resend.isPending) resend.mutate();
  };

  // Locked out, or the sign-up is gone: no code will ever work, so the page
  // offers a fresh start rather than Resend and Verify.
  const restartRequired = [verify.error, resend.error].some(
    (error) => !!error && RESTART_REQUIRED.test(error.message),
  );

  return {
    otpCode,
    restartRequired,
    changeCode,
    submitCode,
    isVerifying: verify.isPending,
    error: verify.error?.message ?? resend.error?.message ?? null,
    cooldown,
    resendCode,
    isResending: resend.isPending,
  };
}

/** `0:24` style countdown for the resend timer. */
export function formatCountdown(seconds: number) {
  const secs = seconds % 60;
  return `${Math.floor(seconds / 60)}:${secs < 10 ? `0${secs}` : secs}`;
}
