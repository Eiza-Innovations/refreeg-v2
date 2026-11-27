import { z } from "zod";
import { normalizeOptionalUrl } from "@/lib/url/normalize-optional-url";

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
  // Count digits, not characters: "+234 901 744 6760" is the form's own
  // placeholder and is longer than 15 characters once spaces are included.
  phone: z
    .string()
    .trim()
    .refine((value) => {
      if (!/^\+?[\d\s\-()]+$/.test(value)) return false;
      const digits = value.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    }, "Enter a valid phone number"),
  websiteUrl: z
    .string()
    .trim()
    .optional()
    .refine((value) => {
      try {
        normalizeOptionalUrl(value, "website");
        return true;
      } catch {
        return false;
      }
    }, "Enter a valid website URL, like korahq.com"),
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
