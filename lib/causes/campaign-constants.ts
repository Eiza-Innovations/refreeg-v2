export const DONATION_PRESETS = [1000, 10000, 100000, 1000000] as const;
export const TIP_PRESETS = [10, 100, 500] as const;
export const TABS = ["Comments", "FAQ"] as const;
export const MIN_DONATION_AMOUNT = 100;

export const DEFAULT_FAQS = [
  {
    question: "How does milestone escrow work?",
    answer:
      "Funds are held until proof is uploaded and reviewed. Each release is logged in the public audit trail.",
  },
  {
    question: "Can I donate without an account?",
    answer:
      "Yes. Guest donations require only an email for receipts and updates.",
  },
  {
    question: "What happens if a milestone fails?",
    answer:
      "Releases pause. The campaign must submit a revised plan or refunds are offered based on policy.",
  },
] as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
} as const;

export const stagger = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;
