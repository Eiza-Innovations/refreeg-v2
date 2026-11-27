import { z } from "zod";

const stripCommas = (value: unknown) =>
  typeof value === "string" ? value.replace(/,/g, "") : value;

const inviteRowSchema = z.object({
  // A blank row is the form's starting state and is skipped on save, so it is
  // valid; only a typed address has to look like an email.
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\S+@\S+\.\S+$/.test(value),
      "Enter a valid email address",
    ),
  role: z.enum(["approver", "viewer"]),
});

export const csrSetupSchema = z
  .object({
    // The field shows thousands separators ("5,000,000"); strip them before parsing.
    csrBudget: z.preprocess(
      stripCommas,
      z.coerce
        .number({ invalid_type_error: "Enter an annual giving budget" })
        .positive("Enter an annual giving budget"),
    ),
    csrFinancialYearStart: z
      .string()
      .min(1, "Choose the month your financial year starts"),
    csrFocusCauses: z.array(z.string()).min(1, "Pick at least one focus cause"),
    csrMatchEmployeeDonations: z.boolean(),
    csrMatchCap: z.preprocess(
      (value) =>
        value === "" || value === undefined ? undefined : stripCommas(value),
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
