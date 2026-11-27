import { z } from "zod";

export const signinSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SigninFields = z.infer<typeof signinSchema>;
