import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_auth_reset_password",
      limit: 10,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const {
      email,
      resetSessionToken,
      newPassword,
      password,
      signOutOtherDevices,
    } = body;

    const effectivePassword = newPassword ?? password;

    if (
      typeof resetSessionToken !== "string" ||
      typeof effectivePassword !== "string" ||
      !resetSessionToken ||
      !effectivePassword
    ) {
      return apiError(
        "Missing required fields (resetSessionToken, newPassword)",
        400,
      );
    }

    if (effectivePassword.length < 8) {
      return apiError("Password must be at least 8 characters long", 400);
    }

    // Verify resetSessionToken HMAC
    const parts = resetSessionToken.split(":");
    if (parts.length !== 3) {
      return apiError("Invalid reset session token", 401);
    }

    const [tokenEmail, tokenTimestamp, tokenHmac] = parts;
    if (email !== undefined && typeof email !== "string") {
      return apiError("Invalid email parameter", 400);
    }
    const normalizedEmail = email ? email.trim().toLowerCase() : tokenEmail;

    if (tokenEmail !== normalizedEmail) {
      return apiError("Token does not match provided email", 401);
    }

    const timestampNum = parseInt(tokenTimestamp, 10);
    const age = Date.now() - timestampNum;
    if (isNaN(age) || age > 15 * 60 * 1000 || age < 0) {
      return apiError(
        "Reset session has expired. Please verify code again.",
        401,
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

    const record = await prisma.passwordResetToken.findUnique({
      where: { email: normalizedEmail },
    });

    if (!record || record.expires < new Date()) {
      return apiError("Reset session has expired or was already used.", 401);
    }

    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(
        `${normalizedEmail}:${tokenTimestamp}:${record.id}:${record.token}`,
      )
      .digest("hex");

    const actualBuf = Buffer.from(tokenHmac, "utf8");
    const expectedBuf = Buffer.from(expectedHmac, "utf8");
    if (
      actualBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(actualBuf, expectedBuf)
    ) {
      return apiError("Invalid reset token signature", 401);
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!user) {
      return apiError("User not found", 404);
    }

    const hashedPassword = await bcrypt.hash(effectivePassword, 10);
    const now = new Date();
    const withdrawalsResumeAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
      await prisma.$transaction([
        prisma.passwordResetToken.delete({
          where: { id: record.id },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            ...(signOutOtherDevices ? { sessions_invalidated_after: now } : {}),
          },
        }),
      ]);
    } catch (txErr: any) {
      if (txErr?.code === "P2025") {
        return apiError("Reset session has expired or was already used.", 401);
      }
      throw txErr;
    }

    return apiSuccess({
      message: "Password reset successfully.",
      withdrawalsResumeAt: withdrawalsResumeAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Mobile API Reset Password Error:", error);
    return apiError("Internal server error", 500);
  }
}
