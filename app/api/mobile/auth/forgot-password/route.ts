import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { prisma } from "@/lib/prisma";
import { generateOtpCode, hashOtpCode } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/services/mail";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_auth_forgot_password",
      limit: 5,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { email } = body;

    if (typeof email !== "string" || !email.trim()) {
      return apiError("Missing required field (email)", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, fullName: true, username: true },
    });

    if (!user) {
      return apiError("No account found with this email address.", 404);
    }

    // Generate 6-digit CSPRNG OTP code expiring in 15 minutes; store only its HMAC hash.
    const otpCode = generateOtpCode();
    const otpHash = hashOtpCode(otpCode);
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetToken.upsert({
      where: { email: normalizedEmail },
      update: {
        token: otpHash,
        expires,
      },
      create: {
        email: normalizedEmail,
        token: otpHash,
        expires,
      },
    });

    const displayName =
      user.fullName || user.username || normalizedEmail.split("@")[0];

    await sendOtpEmail({
      email: normalizedEmail,
      userName: displayName,
      otpCode,
    });

    return apiSuccess({
      message: "Recovery verification code sent to your email.",
    });
  } catch (error: any) {
    console.error("Mobile API Forgot Password Error:", error);
    return apiError("Internal server error", 500);
  }
}
