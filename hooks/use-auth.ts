"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "@/hooks/use-toast";
import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";
import { useAuthContext } from "@/components/layout/AuthProvider";
import {
  signUpAction,
  requestPasswordResetAction,
  resetPasswordAction,
  checkCauseUserLoginAction,
} from "@/actions/users/auth-actions";
import { safeRedirect } from "@/lib/auth/safe-redirect";

export function useAuth() {
  const { user, isLoading, isAuthenticated } = useAuthContext();
  const router = useRouter();

  const signIn = async (
    email: string,
    password: string,
    redirectTo?: string | null,
  ) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      const causeCheck = await checkCauseUserLoginAction(normalizedEmail);
      if (causeCheck?.isCauseUserWithoutProfile && causeCheck.token) {
        toast({
          title: "Account setup required",
          description: `We found your campaign "${causeCheck.causeTitle}". Please set up a new password to continue.`,
        });

        const targetUrl = `/auth/update-password?token=${encodeURIComponent(
          causeCheck.token,
        )}&flow=cause-profile&email=${encodeURIComponent(normalizedEmail)}${
          redirectTo ? `&redirect=${encodeURIComponent(redirectTo)}` : ""
        }`;

        window.location.href = targetUrl;
        return;
      }

      if (!password) {
        toast({
          title: "Password required",
          description: "Please enter your password to sign in.",
          variant: "destructive",
        });
        return;
      }

      const res = await nextAuthSignIn("credentials", {
        redirect: false,
        email: normalizedEmail,
        password,
      });

      if (res?.error) {
        if (res.error === "CredentialsSignin") {
          throw new Error("Invalid credentials");
        }
        throw new Error(`Auth Error: ${res.error}`);
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      const target = safeRedirect(redirectTo) || "/dashboard";
      window.location.href = target;
    } catch (error: any) {
      // Thrown so the form can show the message inline; a toast alone
      // disappears before slow connections finish the request.
      throw new Error(error.message || "Could not sign you in.");
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    accountType?: "individual" | "organization" | null,
  ) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      const res = await signUpAction(
        normalizedEmail,
        password,
        fullName,
        accountType,
      );

      if (!res.success) {
        toast({
          title: "Error signing up",
          description: res.error || "Failed to create account",
          variant: "destructive",
        });
        return;
      }

      const loginRes = await nextAuthSignIn("credentials", {
        redirect: false,
        email: normalizedEmail,
        password,
      });

      if (loginRes?.error) {
        toast({
          title: "Account created",
          description: "Please sign in to continue.",
        });
        router.push("/auth/signin");
        return { success: true };
      }

      toast({
        title: "Account created successfully",
        description:
          "Welcome! Let's set up your profile. Check your email for a welcome message.",
      });

      router.refresh();
      router.push("/onboarding");
      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signInWithGoogle = async (redirectTo?: string | null) => {
    try {
      const target = safeRedirect(redirectTo);
      const callbackUrl = target
        ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(target)}`
        : `${window.location.origin}/auth/callback`;

      await fetch("/api/auth/pre-signin-cleanup", {
        method: "POST",
        credentials: "same-origin",
      });

      await nextAuthSignIn("google", {
        callbackUrl,
      });
    } catch (error: any) {
      toast({
        title: "Error signing in with Google",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      await nextAuthSignOut({ redirect: false });
      window.location.href = "/";
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({
        title: "Error signing out",
        description:
          error?.message || "There was an error signing out. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const res = await requestPasswordResetAction(email);
    if (!res.success) {
      throw new Error(res.error || "Failed to send reset link");
    }
  };

  const updatePassword = async (
    password: string,
    token: string,
    options?: {
      flow?: string | null;
      email?: string | null;
      redirect?: string | null;
    },
  ) => {
    const res = await resetPasswordAction(token, password);
    if (!res.success) {
      throw new Error(res.error || "Failed to reset password");
    }

    const email = options?.email || res.email;

    if (options?.flow === "cause-profile" && email) {
      toast({
        title: "Password set successfully!",
        description: "Proceeding to complete your profile...",
      });

      const loginRes = await nextAuthSignIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (!loginRes?.error) {
        const target = safeRedirect(options?.redirect);
        window.location.href = target
          ? `/onboarding?redirect=${encodeURIComponent(target)}`
          : "/onboarding";
        return;
      }
    }

    toast({
      title: "Password updated",
      description: "Sign in with your new password.",
    });
    router.push("/auth/signin");
  };

  return {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    updatePassword,
  };
}
