const mockSend = jest.fn();
jest.mock("@/services/mail", () => ({
  sendOtpEmail: (...args: unknown[]) => mockSend(...args),
}));

import { sendOtpEmailWithRetry } from "@/lib/auth/send-otp-email";

const message = { email: "a@b.co", userName: "Ada", otpCode: "123456" };

describe("sendOtpEmailWithRetry", () => {
  beforeEach(() => {
    mockSend.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("sends once when the first attempt works", async () => {
    mockSend.mockResolvedValue({ success: true });

    const result = await sendOtpEmailWithRetry(message);

    expect(result).toEqual({ success: true });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("allows the mail server longer than the 10s default, since the browser was already answered", async () => {
    mockSend.mockResolvedValue({ success: true });

    await sendOtpEmailWithRetry(message);

    expect(mockSend).toHaveBeenCalledWith(message, { timeoutMs: 30_000 });
  });

  it("tries again after a timeout and reports the second result", async () => {
    mockSend
      .mockResolvedValueOnce({ success: false, error: "SMTP Timeout" })
      .mockResolvedValueOnce({ success: true });

    const result = await sendOtpEmailWithRetry(message);

    expect(result).toEqual({ success: true });
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("gives up after the attempts are used and returns the last error", async () => {
    mockSend.mockResolvedValue({ success: false, error: "SMTP Timeout" });

    const result = await sendOtpEmailWithRetry(message, 2);

    expect(result).toEqual({ success: false, error: "SMTP Timeout" });
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
