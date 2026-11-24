import { z } from "zod";

export const organizationVerificationSchema = z.object({
  registrationDocKey: z.string().min(1, "Upload the CAC registration document"),
  directorIdKeys: z
    .array(z.string())
    .min(1, "Upload at least one director ID")
    .max(5, "Up to five director IDs"),
});
