import { z } from "zod";

export const queueKeySchema = z.enum([
  "campaigns",
  "kyc",
  "receipts",
  "petitions",
  "reports",
]);
