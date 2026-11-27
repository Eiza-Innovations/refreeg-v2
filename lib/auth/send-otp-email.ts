import { retrySend } from "@/lib/email/retry-send";
import { sendOtpEmail } from "@/services/mail";

type OtpEmail = Parameters<typeof sendOtpEmail>[0];

/** Web sign-up and resend answer the browser first, so the send can wait for a slow mail server. */
const BACKGROUND_SEND_TIMEOUT_MS = 30_000;

/** Sends the verification code, trying once more if the mail server times out. */
export function sendOtpEmailWithRetry(email: OtpEmail, attempts = 2) {
  return retrySend(
    () => sendOtpEmail(email, { timeoutMs: BACKGROUND_SEND_TIMEOUT_MS }),
    attempts,
  );
}
