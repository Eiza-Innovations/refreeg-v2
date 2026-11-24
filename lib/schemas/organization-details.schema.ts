import { z } from "zod";

export const organizationDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organisation name must be at least 2 characters")
    .max(120, "Keep the organisation name under 120 characters"),
  organisationType: z.string().min(1, "Choose the organisation type"),
  registrationNumber: z
    .string()
    .trim()
    .min(3, "Enter the CAC registration number")
    .max(60, "Registration number is too long"),
  country: z.string().min(1, "Choose the country of registration"),
  contactName: z
    .string()
    .trim()
    .min(2, "Enter your name")
    .max(120, "Name is too long"),
  contactRole: z
    .string()
    .trim()
    .min(2, "Enter your role at the organisation")
    .max(80, "Role is too long"),
  adminEmail: z
    .string()
    .trim()
    .regex(/^\S+@\S+\.\S+$/, "Enter a valid work email"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{7,15}$/, "Enter a valid phone number"),
  websiteUrl: z.string().trim().optional().or(z.literal("")),
  username: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9_]{3,30}$/,
      "Use 3-30 lowercase letters, numbers or underscores",
    )
    .optional()
    .or(z.literal("")),
});
