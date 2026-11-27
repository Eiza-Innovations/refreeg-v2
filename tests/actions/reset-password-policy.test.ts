jest.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/auth/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/auth/welcome", () => ({ runPostSignupActions: jest.fn() }));
jest.mock("@/services/mail", () => ({}));

import { prisma } from "@/lib/prisma";
import { resetPasswordAction } from "@/actions/users/auth-actions";

describe("resetPasswordAction password policy", () => {
  it("rejects a weak password before touching the token or the user", async () => {
    const result = await resetPasswordAction("token-1", "abc12345");

    expect(result).toEqual({
      success: false,
      error: "At least 10 characters",
    });
    expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
