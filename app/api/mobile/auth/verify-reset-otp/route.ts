import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { otpMatches } from "@/lib/auth/otp";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_auth_verify_reset_otp",
      limit: 10,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { email, otpCode, otp } = body;
    const effectiveOtp = otpCode ?? otp;

    if (
      typeof email !== "string" ||
      typeof effectiveOtp !== "string" ||
      !email.trim() ||
      !effectiveOtp.trim()
    ) {
      return apiError("Email and verification code are required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = effectiveOtp.trim();

    const emailRateLimited = enforceRateLimit(request, {
      namespace: "mobile_auth_verify_reset_otp_email",
      limit: 5,
      windowMs: 15 * 60_000,
      identifier: normalizedEmail,
    });
    if (emailRateLimited) return emailRateLimited;

    const record = await prisma.passwordResetToken.findUnique({
      where: { email: normalizedEmail },
    });

    if (!record) {
      return apiError(
        "No recovery request found for this email. Please request a new code.",
        404,
      );
    }

    if (record.expires < new Date()) {
      return apiError(
        "Verification code has expired. Please request a new one.",
        400,
      );
    }

    if (!otpMatches(normalizedCode, record.token)) {
      return apiError(
        "Invalid verification code. Please check and try again.",
        400,
      );
    }

    const secret =
      process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      (process.env.NODE_ENV === "production" ? "" : "refreeg-auth-secret-key");
    if (!secret) {
      console.error("AUTH_SECRET / NEXTAUTH_SECRET is missing in production");
      return apiError("Server configuration error", 500);
    }
    const timestamp = Date.now().toString();
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(`${normalizedEmail}:${timestamp}:${record.id}:${record.token}`)
      .digest("hex");

    const resetSessionToken = `${normalizedEmail}:${timestamp}:${hmac}`;

    return apiSuccess({
      message: "Verification successful.",
      resetSessionToken,
      email: normalizedEmail,
    });
  } catch (error: any) {
    console.error("Mobile API Verify Reset OTP Error:", error);
    return apiError("Internal server error", 500);
  }
}
