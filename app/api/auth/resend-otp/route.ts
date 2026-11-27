import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmailWithRetry } from "@/lib/auth/send-otp-email";
import { generateOtpCode, hashOtpCode } from "@/lib/auth/otp";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    const pendingUser = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pendingUser) {
      return NextResponse.json(
        { error: "No pending registration found. Please sign up again." },
        { status: 404 },
      );
    }

    if (pendingUser.lastOtpSentAt) {
      const secondsSinceLastSend =
        (Date.now() - pendingUser.lastOtpSentAt.getTime()) / 1000;
      if (secondsSinceLastSend < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceLastSend);
        return NextResponse.json(
          {
            error: `Please wait ${waitSeconds} seconds before requesting a new code.`,
          },
          { status: 429 },
        );
      }
    }

    // Generate a new 6-digit OTP
    const newOtp = generateOtpCode();
    const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update pending registration (reset failed attempts since new code is issued)
    await prisma.pendingRegistration.update({
      where: { email: normalizedEmail },
      data: {
        otpCode: hashOtpCode(newOtp),
        expiresAt: newExpiresAt,
        failedAttempts: 0,
        lastOtpSentAt: new Date(),
      },
    });

    // Respond before sending: the code is already persisted above, and
    // awaiting SMTP inline made the resend request wait on the mail server.
    after(async () => {
      const emailResult = await sendOtpEmailWithRetry({
        email: normalizedEmail,
        userName: pendingUser.fullName,
        otpCode: newOtp,
      });
      if (!emailResult.success) {
        console.error("Failed to resend OTP:", emailResult.error);
      }
    });

    return NextResponse.json(
      { message: "A new verification code has been sent to your email." },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
