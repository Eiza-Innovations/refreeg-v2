import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/services/mail";
import { generateOtpCode, hashOtpCode } from "@/lib/auth/otp";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_auth_resend_otp",
      limit: 10,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { email } = body;

    if (typeof email !== "string" || !email.trim()) {
      return apiError("Email is required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if there is an existing pending registration
    const pendingUser = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pendingUser) {
      return apiError(
        "No pending registration found. Please sign up again.",
        404,
      );
    }

    // 2. Rate limit: prevent resending more than once per minute
    if (pendingUser.lastOtpSentAt) {
      const secondsSinceLastSend =
        (Date.now() - pendingUser.lastOtpSentAt.getTime()) / 1000;
      if (secondsSinceLastSend < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceLastSend);
        return apiError(
          `Please wait ${waitSeconds} seconds before requesting a new code.`,
          429,
        );
      }
    }

    // 3. Generate a new 6-digit OTP and store only its HMAC so leaked DB rows cannot mint accounts.
    // Preserve failedAttempts so requesting a new code never resets brute-force lockout.
    const newOtp = generateOtpCode();
    const newOtpHash = hashOtpCode(newOtp);
    const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 4. Update pending registration
    await prisma.pendingRegistration.update({
      where: { email: normalizedEmail },
      data: {
        otpCode: newOtpHash,
        expiresAt: newExpiresAt,
        lastOtpSentAt: new Date(),
      },
    });

    // 5. Send the new OTP email
    const emailResult = await sendOtpEmail({
      email: normalizedEmail,
      userName: pendingUser.fullName,
      otpCode: newOtp,
    });

    if (!emailResult.success) {
      console.error("Mobile Resend OTP email error:", emailResult.error);
      return apiError(
        "Failed to send verification email. Please try again.",
        500,
      );
    }

    return apiSuccess(
      { message: "A new verification code has been sent to your email." },
      200,
    );
  } catch (error: any) {
    console.error("Mobile Resend OTP error:", error);
    return apiError("Internal server error", 500);
  }
}
