import type { Option } from "@/types/options";

export const analyticsPeriodOptions = [
  { label: "Day", value: "day" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
] as const satisfies readonly Option[];

export const funnelStepOptions = [
  { label: "Viewed campaign", value: "view" },
  { label: "Tapped Give", value: "give" },
  { label: "Chose an amount", value: "amount" },
  { label: "Reached payment", value: "payment" },
  { label: "Paid", value: "paid" },
] as const satisfies readonly Option[];

export const leaveReasonOptions = [
  { label: "Card declined", value: "card_declined" },
  { label: "Closed the OTP screen", value: "abandoned" },
  { label: "Transfer not completed", value: "transfer_incomplete" },
  { label: "Network timeout", value: "timeout" },
] as const satisfies readonly Option[];

export const velocityStateOptions = [
  { label: "Live", value: "live" },
  { label: "Frozen", value: "frozen" },
  { label: "Ended", value: "ended" },
] as const satisfies readonly Option[];

export const velocityForecastOptions = [
  { label: "Any forecast", value: "all" },
  { label: "Will hit goal", value: "will-hit" },
  { label: "Short of goal", value: "short" },
  { label: "Stalled", value: "stalled" },
  { label: "No end date", value: "open" },
] as const satisfies readonly Option[];

export const riskSuggestionOptions = [
  { label: "Take down", value: "take-down" },
  { label: "Freeze", value: "freeze" },
  { label: "Review", value: "review" },
  { label: "Watch", value: "watch" },
] as const satisfies readonly Option[];

export const takedownReasonOptions = [
  { label: "Fraud · fake medical documents", value: "fake_documents" },
  { label: "Fraud · stolen or reused photos", value: "reused_media" },
  { label: "Fraud · beneficiary not real", value: "fake_beneficiary" },
  { label: "Funds misused", value: "funds_misused" },
  { label: "Duplicate campaign", value: "duplicate" },
  { label: "Breaks community rules", value: "policy" },
] as const satisfies readonly Option[];

export const takedownFundOptions = [
  {
    label: "Refund all donors",
    value: "refund",
    hint: "Queued for finance to return to cards, transfers and crypto.",
  },
  {
    label: "Keep funds held",
    value: "hold",
    hint: "For a police or bank investigation.",
  },
] as const satisfies readonly (Option & { hint: string })[];

export const velocityCategoryOptions = [
  { label: "All categories", value: "all" },
] as const satisfies readonly Option[];

export const BIG_GIFT_AMOUNT = 50_000;

export const funnelSegmentOptions = [
  { label: "Mobile web, Android", value: "android" },
  { label: "Mobile web, iPhone", value: "ios" },
  {
    label: `Gifts over ₦${BIG_GIFT_AMOUNT.toLocaleString()}`,
    value: "big_gift",
  },
  { label: "First-time donors", value: "first_time" },
  { label: "Campaigns without photos", value: "no_photo" },
] as const satisfies readonly Option[];
