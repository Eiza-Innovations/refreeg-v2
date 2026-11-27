import { z } from "zod";
import { getPasswordErrors } from "@/lib/auth/registration";
import { signinSchema } from "@/lib/schemas/signin.schema";

export const requestResetSchema = z.object({
  email: signinSchema.shape.email,
});

export type RequestResetFields = z.infer<typeof requestResetSchema>;

/** New password: the sign-up strength rules plus a matching confirmation. */
export const newPasswordSchema = z
  .object({
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((value, context) => {
    const [passwordError] = getPasswordErrors(value.password);
    if (passwordError) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: passwordError,
      });
    }
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export type NewPasswordFields = z.infer<typeof newPasswordSchema>;
