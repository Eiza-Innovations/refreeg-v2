import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Fee Policy - RefreeG",
  description:
    "Every fee on RefreeG, up front: what givers pay, what creators receive, and how payouts work.",
};

const processingFees = [
  {
    provider: "Paystack",
    detail:
      "1.5% of the donation, plus a ₦100 flat fee on donations above ₦2,500. Capped at ₦10,000 per transaction.",
  },
  {
    provider: "Flutterwave",
    detail:
      "1.4% of the donation (the amount is adjusted so the net lands whole).",
  },
];

const rows: { title: string; body: string[] }[] = [
  {
    title: "What giving costs",
    body: [
      "You pay the amount you choose to give, plus a payment processing fee charged by the payment provider (Paystack or Flutterwave) for handling the transaction. The processing fee is calculated in Naira and shown on the payment screen before you confirm — nothing is added silently.",
      "Guest giving works the same way: you do not need an account, and the receipt goes to the email you enter.",
    ],
  },
  {
    title: "Platform service fee",
    body: [
      "RefreeG charges no platform service fee on donations today: creators keep 100% of what is raised, and givers pay nothing beyond the processing fee above.",
      "If we ever introduce a service fee, it will be published on this page first and applied going forward — never retroactively. By design, any future service fee is capped at ₦10,000 per donation.",
    ],
  },
  {
    title: "Payment processing fees (charged by providers)",
    body: ["These are charged by our payment providers, not by RefreeG:"],
  },
  {
    title: "Wishlist gifts",
    body: [
      "Gifts to wishlist items follow the same model: the giver pays the amount plus the provider's processing fee, and no platform service fee applies. Wishlist owners without verified payout details can collect up to ₦500,000 in total gifts; completing verification in settings lifts the cap automatically.",
    ],
  },
  {
    title: "Payouts",
    body: [
      "Funds raised go to the bank account or Paystack/Flutterwave sub-account registered on your profile, once identity verification is approved and the details match your name. Payouts are settled in Naira to Nigerian bank accounts.",
      "We may hold a payout where verification is incomplete or mismatched, where a fraud report, chargeback or dispute is open, or where the law requires it. Wishlists with unverified owners are capped (see above) rather than blocked.",
    ],
  },
  {
    title: "Failed and reversed payments",
    body: [
      "Failed charges cost nothing: no fee is charged and nothing is recorded against the campaign or wishlist.",
      "If a completed transaction is refunded or charged back, the processing fee is not returned by the provider, so refunds are net of the processing fee. Confirmed fraud is refunded from available funds and the responsible account is suspended.",
    ],
  },
  {
    title: "Receipts and records",
    body: [
      "Every completed gift gets a receipt to the giver's email, and creators can download giving records from their dashboard. If a receipt is missing, contact support@refreeg.com with the payment reference.",
    ],
  },
];

export default function FeePolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
        Legal
      </p>
      <h1 className="mt-3 font-fraunces text-4xl font-medium text-ink sm:text-5xl">
        Fee Policy
      </h1>
      <p className="mt-3 text-sm text-ink/60">
        Last updated 28 November 2026 · Eiza Innovations Limited (RC 8032815)
      </p>
      <p className="mt-6 text-base leading-7 text-ink/70">
        Every fee on RefreeG, up front — no hidden charges, no fine print
        surprises. Changes to this page are announced before they take effect.
        See also our{" "}
        <Link
          href="/terms"
          className="font-medium text-blue-accent underline underline-offset-2"
        >
          terms of service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="font-medium text-blue-accent underline underline-offset-2"
        >
          privacy policy
        </Link>
        .
      </p>

      <div className="mt-10 space-y-8">
        {rows.map((row) => (
          <section
            key={row.title}
            className="rounded-xl border border-hairline bg-surface p-6 shadow-subtle sm:p-8"
          >
            <h2 className="text-lg font-semibold text-ink">{row.title}</h2>
            {row.body.map((paragraph) => (
              <p
                key={paragraph.slice(0, 24)}
                className="mt-3 text-sm leading-7 text-ink/70"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <section className="rounded-xl border border-hairline bg-surface p-6 shadow-subtle sm:p-8">
          <h2 className="text-lg font-semibold text-ink">
            Provider fee breakdown
          </h2>
          <ul className="mt-3 space-y-3">
            {processingFees.map((fee) => (
              <li key={fee.provider} className="text-sm leading-7 text-ink/70">
                <span className="font-semibold text-ink">{fee.provider}:</span>{" "}
                {fee.detail}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-10 rounded-xl border border-hairline bg-bone p-6">
        <p className="text-sm font-semibold text-ink">Related policies</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link
            href="/terms"
            className="text-blue-accent underline underline-offset-2"
          >
            Terms of service
          </Link>
          <Link
            href="/privacy"
            className="text-blue-accent underline underline-offset-2"
          >
            Privacy policy
          </Link>
          <Link
            href="/faq"
            className="text-blue-accent underline underline-offset-2"
          >
            FAQ
          </Link>
        </div>
      </div>
    </main>
  );
}
