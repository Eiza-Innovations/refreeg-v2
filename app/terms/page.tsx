import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - RefreeG",
  description:
    "The rules for giving, raising and trading value on RefreeG — campaigns, petitions and wishlists operated by Eiza Innovations Limited.",
};

const sections: {
  title: string;
  body: string[];
  points?: string[];
}[] = [
  {
    title: "1. About these terms",
    body: [
      'RefreeG is a crowdfunding platform operated by Eiza Innovations Limited (RC 8032815), Nigeria ("RefreeG", "we", "us"). These Terms of Service form an agreement between you and Eiza Innovations Limited and govern your use of refreeg.com and everything offered through it: fundraising campaigns, petitions, wishlists, referral rewards and the tools around them.',
      "By creating an account, giving to a campaign or wishlist, signing a petition or otherwise using the platform, you accept these terms. If you do not accept them, do not use RefreeG.",
    ],
  },
  {
    title: "2. Who can use RefreeG",
    body: [
      "You must be at least 18 years old and legally able to enter contracts. Accounts are personal until you register an organisation, and you are responsible for everything done through your account, so keep your credentials safe and tell us immediately if you suspect unauthorised access.",
      "Giving from outside Nigeria is supported through our payment providers, but payouts are made to Nigerian bank accounts in Naira.",
    ],
  },
  {
    title: "3. Accounts, verification and KYC",
    body: [
      "Some actions require identity verification. We verify identity documents through Didit, and payout eligibility depends on it: campaign and wishlist owners need approved identity verification and matching payout details before funds move.",
      "You agree to provide accurate, current information during onboarding, KYC and payout setup. Providing false information, or using another person's identity or documents, is grounds for immediate suspension and forfeiture of pending payouts.",
    ],
  },
  {
    title: "4. Raising money on RefreeG",
    body: [
      "Campaigns, wishlists and petitions are created by users. As a creator you promise that:",
    ],
    points: [
      "the story, goal amount, photos and supporting documents you publish are truthful and not misleading;",
      "funds raised are used for the stated purpose, and you can account for how they were used;",
      "you are not raising for anything illegal, fraudulent, hateful, sexual, dangerous or in breach of these terms;",
      "you are not re-launching a campaign that was previously taken down or refunded;",
      "you keep proof-of-impact updates on your campaign accurate and current.",
    ],
  },
  {
    title: "5. Giving on RefreeG",
    body: [
      "When you give to a campaign or a wishlist item, you authorise our payment providers (Paystack, Flutterwave and any provider we later add) to charge the amount you confirmed, in Naira. A completed transaction is a completed gift: RefreeG is not a shop, and gifts are not purchases of goods or services.",
      "Guest giving is supported: we record your email so receipts can be delivered and, where you later claim the gift with the same email, so the gift can appear in your giving history.",
      "RefreeG does not guarantee that a campaign reaches its goal, that a creator completes their project, or that a wishlist item is bought. We screen campaigns before they go live and act on reports, but the decision to give is yours. Read the campaign or wishlist, use the verified markers and proof updates, and give accordingly.",
    ],
  },
  {
    title: "6. Fees",
    body: [
      "RefreeG charges no platform service fee on donations today: creators keep 100% of what is raised. Payment processing fees charged by Paystack or Flutterwave apply to transactions and are shown to the giver before payment. Our full, current fee schedule — including any future changes — lives on the Fee Policy page, which forms part of these terms.",
    ],
  },
  {
    title: "7. Payouts and holds",
    body: [
      "Funds you raise are paid out to the bank account or sub-account registered on your profile, subject to verification. We may hold or delay a payout where identity or bank details are unverified or mismatched, where we receive credible reports of fraud, where a chargeback or dispute is in progress, or where the law requires it.",
      "Wishlists have a collection cap until the owner completes payout verification; the cap is lifted automatically once verification completes.",
    ],
  },
  {
    title: "8. Refunds and chargebacks",
    body: [
      "Donations are generally irreversible once completed. We will refund a transaction where we are legally required to, where the payment was clearly fraudulent or duplicated, or where a creator is removed for fraud — in that case we refund from available funds.",
      "If you dispute a charge through your bank (chargeback), we will cooperate with the payment provider's process and may suspend the campaign and the giver or creator accounts involved until it is resolved.",
    ],
  },
  {
    title: "9. Petitions",
    body: [
      "Petitions on RefreeG are advocacy tools: signatures and messages are collected and shown to decision-makers as public pressure, not payments. You may not offer or imply payment for signatures, sign with fabricated identities, or use a petition to harass a named individual. We may remove petitions that break these rules or the law.",
    ],
  },
  {
    title: "10. Referral rewards",
    body: [
      "RefreeG may reward users who bring new givers to the platform. Rewards are credited under the rules shown on the referrals page and require, at minimum, that the referred gift is genuine and completed. Self-referrals, fake accounts and collusive gifting void rewards, and we may claw back rewards credited in error.",
    ],
  },
  {
    title: "11. Content and conduct",
    body: [
      "You keep ownership of what you publish, but you grant RefreeG a licence to host, display and share it for the purpose of running the platform — including showing campaign media on public pages, receipts and social channels.",
      "Do not upload content you have no right to use, impersonate people or organisations, scrape the platform, interfere with its security, or use it to send spam or malicious code. We may remove content, pause a campaign pending review, or take down a campaign that breaches these rules.",
    ],
  },
  {
    title: "12. Suspension and termination",
    body: [
      "You can delete your account from settings at any time; required financial records are retained as described in the Privacy Policy. We may suspend or terminate an account where these terms are breached, where verification fails, or where the law requires it. Where funds are involved, payouts on legitimately completed gifts are settled before closure, and confirmed fraud forfeits them.",
    ],
  },
  {
    title: "13. Disclaimers and liability",
    body: [
      'RefreeG is provided "as is". To the extent permitted by law, we are not liable for indirect or consequential losses, for a creator\'s failure to use funds as promised, or for losses arising from events outside our reasonable control.',
      "Nothing in these terms limits liability that cannot lawfully be limited. Our total liability to you for any claim connected to the platform is limited to the total amount you gave or raised through RefreeG in the six months before the claim.",
    ],
  },
  {
    title: "14. Law, changes and contact",
    body: [
      "These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Nigeria have jurisdiction over disputes.",
      "We may update these terms as the product changes; material changes will be announced on the platform or by email, and continuing to use RefreeG after a change takes effect means you accept the updated terms.",
      "Questions, reports and legal notices: support@refreeg.com, or via the community channels linked in the app footer.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
        Legal
      </p>
      <h1 className="mt-3 font-fraunces text-4xl font-medium text-ink sm:text-5xl">
        Terms of Service
      </h1>
      <p className="mt-3 text-sm text-ink/60">
        Last updated 28 November 2026 · Eiza Innovations Limited (RC 8032815)
      </p>
      <p className="mt-6 text-base leading-7 text-ink/70">
        The rules for giving, raising and being part of RefreeG — written to be
        read, not skimmed past. Pair it with our{" "}
        <Link
          href="/privacy"
          className="font-medium text-blue-accent underline underline-offset-2"
        >
          privacy policy
        </Link>{" "}
        and{" "}
        <Link
          href="/crowdfund/fees"
          className="font-medium text-blue-accent underline underline-offset-2"
        >
          fee policy
        </Link>
        .
      </p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-xl border border-hairline bg-surface p-6 shadow-subtle sm:p-8"
          >
            <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p
                key={paragraph.slice(0, 24)}
                className="mt-3 text-sm leading-7 text-ink/70"
              >
                {paragraph}
              </p>
            ))}
            {section.points ? (
              <ul className="mt-3 space-y-2">
                {section.points.map((point) => (
                  <li
                    key={point.slice(0, 24)}
                    className="flex gap-2.5 text-sm leading-7 text-ink/70"
                  >
                    <span
                      aria-hidden
                      className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-forest"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-hairline bg-bone p-6">
        <p className="text-sm font-semibold text-ink">Related policies</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link
            href="/privacy"
            className="text-blue-accent underline underline-offset-2"
          >
            Privacy policy
          </Link>
          <Link
            href="/crowdfund/fees"
            className="text-blue-accent underline underline-offset-2"
          >
            Fee policy
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
