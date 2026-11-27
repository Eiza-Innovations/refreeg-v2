import { z } from "zod";

/** Each of first and last name; sign-up already caps the full name at 120. */
export const MAX_NAME_LENGTH = 60;

export const usernameSchema = z
  .string()
  .trim()
  .min(1, "Username is required")
  .min(3, "Username must be at least 3 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only contain letters, numbers, and underscores",
  );

export const onboardingProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(
      MAX_NAME_LENGTH,
      `First name must be ${MAX_NAME_LENGTH} characters or fewer`,
    ),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(
      MAX_NAME_LENGTH,
      `Last name must be ${MAX_NAME_LENGTH} characters or fewer`,
    ),
  username: usernameSchema,
  location: z.string().trim().min(1, "Location is required"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^\+?[\d\s\-()]+$/, "Please enter a valid phone number"),
  consent: z.boolean().refine((agreed) => agreed, {
    message: "You must agree to the terms and conditions",
  }),
});

export type OnboardingProfileFields = z.infer<typeof onboardingProfileSchema>;
