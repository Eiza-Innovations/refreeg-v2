import { newPasswordSchema } from "@/lib/schemas/password-reset.schema";

function issues(password: string, confirmPassword = password) {
  const result = newPasswordSchema.safeParse({ password, confirmPassword });
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], issue.message]),
      );
}

describe("newPasswordSchema", () => {
  it("accepts a password that meets the sign-up rules", () => {
    expect(issues("Qa-0efOjvnF_cK5FQ1!")).toEqual({});
  });

  it("rejects the weak password the old 8-character check allowed", () => {
    expect(issues("abc12345").password).toBe("At least 10 characters");
  });

  it("flags a mismatched confirmation on the confirm field", () => {
    expect(issues("Qa-0efOjvnF_cK5FQ1!", "Different-Pass1!")).toEqual({
      confirmPassword: "Passwords do not match",
    });
  });
});
