import { z } from "zod";

export const bountySchema = z.object({
  title: z.string().trim().min(4, "Enter a clear bounty title"),
  campaign: z.string().min(1, "Choose a campaign"),
  category: z.string().min(1, "Choose a bounty category"),
  description: z
    .string()
    .trim()
    .min(20, "Explain the task in at least 20 characters"),
  deliverable: z
    .string()
    .trim()
    .min(10, "Describe what a valid submission must include"),
  reward: z
    .string()
    .min(1, "Enter a reward")
    .refine((value) => Number(value) > 0, "Reward must be more than zero"),
  availableSpots: z
    .string()
    .min(1, "Enter the number of available spots")
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) > 0,
      "Available spots must be a whole number",
    ),
  deadline: z.string().min(1, "Choose a submission deadline"),
});

export const bountyChangeRequestSchema = z.object({
  feedback: z
    .string()
    .trim()
    .min(10, "Explain what the campaign owner needs to change"),
});
