import { z } from "zod";

const inviteRowSchema = z.object({
  email: z
    .string()
    .trim()
    .regex(/^\S+@\S+\.\S+$/, "Enter a valid email address"),
  role: z.enum(["approver", "viewer"]),
});

export const csrSetupSchema = z
  .object({
    csrBudget: z.coerce
      .number({ invalid_type_error: "Enter an annual giving budget" })
      .positive("Enter an annual giving budget"),
    csrFinancialYearStart: z
      .string()
      .min(1, "Choose the month your financial year starts"),
    csrFocusCauses: z.array(z.string()).min(1, "Pick at least one focus cause"),
    csrMatchEmployeeDonations: z.boolean(),
    csrMatchCap: z.preprocess(
      (value) => (value === "" || value === undefined ? undefined : value),
      z.coerce
        .number()
        .positive("Enter the matching cap per employee")
        .optional(),
    ),
    csrPublicReport: z.boolean(),
    invites: z
      .array(inviteRowSchema)
      .max(10, "Up to 10 invites at once")
      .default([]),
  })
  .refine(
    (data) => !data.csrMatchEmployeeDonations || (data.csrMatchCap ?? 0) > 0,
    {
      message: "Enter the matching cap per employee",
      path: ["csrMatchCap"],
    },
  );
