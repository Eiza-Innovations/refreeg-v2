import type { Option } from "@/types/options";

export const causeCurrencyOptions = [
  { label: "Naira (₦)", value: "NGN" },
] as const satisfies readonly Option[];

export const myCauseStatusOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "approved" },
  { label: "Suspended", value: "suspended" },
  { label: "Under review", value: "pending" },
  { label: "Needs revision", value: "rejected" },
] as const satisfies readonly Option[];

export const causeSteps = [
  "Cause",
  "Story",
  "Target",
  "Photos",
  "Review",
] as const;

const sharedStepMeta = [
  {
    title: "What kind of campaign is this?",
    description:
      "Choose a category and tell supporters where the campaign is based.",
  },
  {
    title: "Title and story",
    description:
      "Tell supporters who you’re helping, what happened, and how they can help.",
  },
  {
    title: "Target and deadline",
    description:
      "Set how much you want to raise and when fundraising will run.",
  },
  {
    title: "Photos and videos",
    description:
      "Choose a cover photo and add any other media that helps tell the story.",
  },
] as const;

export const createCauseStepMeta = [
  ...sharedStepMeta,
  {
    title: "Review your campaign",
    description: "Check your campaign details before sending them for review.",
  },
] as const;

export const editCauseStepMeta = [
  ...sharedStepMeta,
  {
    title: "Review your changes",
    description:
      "Check the updated details before sending your changes for review.",
  },
] as const;
