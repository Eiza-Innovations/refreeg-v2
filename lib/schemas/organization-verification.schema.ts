import { z } from "zod";

export const organizationVerificationSchema = z.object({
  registrationDocKey: z
    .string()
    .min(1, "Upload the CAC Certificate of Incorporation / Registration"),
  statusReportDocKey: z
    .string()
    .min(1, "Upload the CAC Status Report (or Form CAC 2 & 7)"),
  memartDocKey: z.string().optional().default(""),
  scumlDocKey: z.string().optional().default(""),
  tinDocKey: z.string().optional().default(""),
  addressProofDocKey: z.string().optional().default(""),
  directorIdKeys: z
    .array(z.string())
    .min(1, "Upload at least one director or trustee ID")
    .max(5, "Up to five director IDs"),
});

export type OrganizationVerificationInput = z.infer<
  typeof organizationVerificationSchema
>;
