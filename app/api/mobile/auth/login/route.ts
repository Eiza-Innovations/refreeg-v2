import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { trackLoginCore } from "@/lib/rewards/reward-core";
import { signMobileToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const LOGIN_MAX_FAILED_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_auth_login",
      limit: 15,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { email, password } = body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return apiError("Missing required fields (email, password)", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRateLimited = enforceRateLimit(request, {
      namespace: "mobile_auth_login_email",
      limit: 10,
      windowMs: 60_000,
      identifier: normalizedEmail,
    });
    if (emailRateLimited) return emailRateLimited;

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return apiError("No account found with this email address.", 404);
    }

    if (!user.password) {
      return apiError(
        "This account was created using Google Sign-In. Please sign in with Google.",
        400,
      );
    }

    if (
      user.locked_until &&
      new Date(user.locked_until).getTime() > Date.now()
    ) {
      return apiError(
        "Account temporarily locked due to too many failed login attempts. Try again later.",
        429,
      );
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      const attempts = (user.failed_login_attempts ?? 0) + 1;
      const lock =
        attempts >= LOGIN_MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000)
          : null;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: lock ? 0 : attempts,
          ...(lock ? { locked_until: lock } : {}),
        },
      });
      return apiError("Incorrect password. Please try again.", 401);
    }

    if (user.isBlocked) {
      return apiError("Your account has been blocked", 403);
    }

    if (user.failed_login_attempts > 0 || user.locked_until) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failed_login_attempts: 0, locked_until: null },
      });
    }

    // Track login for rewards/streaks (fire and forget)
    trackLoginCore(user.id).catch(console.error);

    // Send login security email notification (parity with web login)
    import("@/services/mail")
      .then(({ sendLoginNotificationEmail }) =>
        sendLoginNotificationEmail({
          email: user.email!,
          userName: user.fullName || "User",
          device: request.headers.get("user-agent") || "RefreeG Mobile App",
          loginTime: new Date().toLocaleString(),
        }),
      )
      .catch((err) => console.error("Mobile login email error:", err));

    // Generate token
    const token = await signMobileToken(user.id, user.email!);

    return apiSuccess({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        accountType: user.accountType,
        profilePhoto: user.profilePhoto,
        isVerified: user.isVerified,
        onboardingCompleted: user.onboarding_completed,
      },
    });
  } catch (error: any) {
    console.error("Mobile API Login Error:", error);
    return apiError("Internal server error", 500);
  }
}
