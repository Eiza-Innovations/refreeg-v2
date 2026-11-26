import { z } from "zod";

export const analyticsPeriodSchema = z.enum(["day", "month", "year"]);

export const takedownReasonValues = [
  "fake_documents",
  "reused_media",
  "fake_beneficiary",
  "funds_misused",
  "duplicate",
  "policy",
] as const;

export const takedownCampaignSchema = z.object({
  causeId: z.string().uuid(),
  reason: z.enum(takedownReasonValues, {
    errorMap: () => ({ message: "Choose why the campaign is coming down" }),
  }),
  funds: z.enum(["refund", "hold"]),
  suspendCreator: z.boolean(),
  notifyDonors: z.boolean(),
  note: z.string().trim().max(1000, "Keep the note under 1000 characters"),
});

export type TakedownCampaignInput = z.infer<typeof takedownCampaignSchema>;

export const campaignRiskActionSchema = z.object({
  causeId: z.string().uuid(),
  action: z.enum(["freeze", "clear"]),
});

export type CampaignRiskActionInput = z.infer<typeof campaignRiskActionSchema>;

export const funnelEventSchema = z.object({
  causeId: z.string().uuid(),
  sessionId: z.string().min(8).max(64),
  step: z.enum(["view", "give", "amount", "payment"]),
  amount: z.number().positive().max(1_000_000_000).optional(),
  reference: z.string().max(120).optional(),
});

export type FunnelEventInput = z.infer<typeof funnelEventSchema>;
