import { csrSetupSchema } from "@/lib/schemas/csr-setup.schema";

const base = {
  csrBudget: "5000000",
  csrFinancialYearStart: "January",
  csrFocusCauses: ["education"],
  csrMatchEmployeeDonations: false,
  csrMatchCap: "50000",
  csrPublicReport: false,
};

describe("csrSetupSchema invites", () => {
  it("accepts the untouched blank invite row so people can skip inviting", () => {
    const result = csrSetupSchema.safeParse({
      ...base,
      invites: [{ email: "", role: "approver" }],
    });
    expect(result.success).toBe(true);
  });

  it("still rejects a typed address that is not an email", () => {
    const result = csrSetupSchema.safeParse({
      ...base,
      invites: [{ email: "not-an-email", role: "approver" }],
    });
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0].message).toBe(
      "Enter a valid email address",
    );
  });

  it("accepts a real address", () => {
    const result = csrSetupSchema.safeParse({
      ...base,
      invites: [{ email: "finance@example.com", role: "viewer" }],
    });
    expect(result.success).toBe(true);
  });

  it("parses a budget shown with thousands separators", () => {
    const result = csrSetupSchema.safeParse({
      ...base,
      csrBudget: "5,000,000",
      invites: [],
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data.csrBudget).toBe(5000000);
  });
});
