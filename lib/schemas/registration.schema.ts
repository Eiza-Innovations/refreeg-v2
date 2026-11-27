import { z } from "zod";
import {
  normalizeRegistrationInput,
  validateRegistrationInput,
} from "@/lib/auth/registration";

/**
 * Sign-up form fields. The rules live in `lib/auth/registration.ts` (shared
 * with the server); each message it produces is attached to its own field.
 */
export const signupSchema = z
  .object({
    email: z.string(),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((value, context) => {
    const errors = validateRegistrationInput(
      normalizeRegistrationInput({ accountType: "individual", ...value }),
    );
    for (const field of ["email", "password", "confirmPassword"] as const) {
      const message = errors[field];
      if (message) {
        context.addIssue({ code: "custom", path: [field], message });
      }
    }
  });

export type SignupFields = z.infer<typeof signupSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });
