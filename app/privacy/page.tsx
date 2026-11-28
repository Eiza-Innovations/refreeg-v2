import type { Metadata } from "next";
import Link from "next/link";
import { DATA_RETENTION_POLICY } from "@/lib/config/retention";

export const metadata: Metadata = {
  title: "Privacy Policy - RefreeG",
  description:
    "How RefreeG collects, uses, shares and protects your data — written for Nigerian data protection law (NDPA 2023).",
};

const sections: {
  title: string;
  body: string[];
  points?: string[];
}[] = [
  {
    title: "1. Who we are",
    body: [
      "RefreeG is operated by Eiza Innovations Limited (RC 8032815), Nigeria. We are the data controller for personal data processed through refreeg.com and the RefreeG mobile app. Questions or requests about your data go to support@refreeg.com.",
    ],
  },
  {
    title: "2. Information we collect",
    body: ["What we collect depends on what you do on RefreeG:"],
    points: [
      "Account data: name, email, phone number, username, profile photo, password (hashed), account type and onboarding answers (gender, location, interests).",
      "Identity verification (KYC) data: the identity document images and details you submit, verification session results and decision notes from our verification provider (Didit).",
      "Payout data: bank account number, bank name and account holder details, plus provider sub-account codes (Paystack/Flutterwave) when you register to receive funds.",
      "Giving data: donation and wishlist gift amounts, recipient campaign or wishlist, payment references, referral codes, and — for guest gifts — the name and email you entered at checkout.",
      "Petition data: signatures and any message you add to a petition you sign.",
      "Wishlist data: wishlist titles, item lists, prices and images you publish.",
      "Technical data: IP address, device and browser information, error logs and crash reports (via Sentry), and product analytics.",
    ],
  },
  {
    title: "3. Why we process it",
    body: [
      "We process your data to run the platform: to create and secure your account, verify identity before payouts, move money through our payment providers, deliver receipts, show your public profile, attribute gifts to your giving history, administer referral rewards, provide support, and prevent fraud and abuse.",
      "Where Nigerian law requires a legal basis, we rely on: performance of a contract (running your account and payments), legitimate interests (security, fraud prevention, product improvement), consent (marketing emails and optional data uses), and legal obligations (financial and tax record-keeping).",
    ],
  },
  {
    title: "4. Who we share it with",
    body: ["We only share what is needed, with:"],
    points: [
      "Payment processors — Paystack and Flutterwave — to charge and settle donations and payouts.",
      "Identity verification provider (Didit) for KYC checks and status syncs.",
      "Infrastructure providers — hosting, database, object storage and email delivery — under contract to process data only on our instructions.",
      "Error monitoring (Sentry) for crash and error reporting, filtered to exclude browser-extension noise.",
      "Law enforcement, regulators or courts where the law requires it, or to protect users and the platform from fraud.",
      "Public surfaces: your public profile, campaigns, wishlists and petitions show the information you chose to publish.",
    ],
  },
  {
    title: "5. Cookies and local storage",
    body: [
      "We use essential cookies and browser local storage to keep you signed in, remember where you were in onboarding, attribute gifts you make while logged out to the right email, and track referral codes (the ref_v1 cookie) so referral rewards are credited. We do not run third-party advertising trackers.",
    ],
  },
  {
    title: "6. How long we keep data",
    body: [
      "We keep personal data only as long as needed for the purposes above and the retention windows required by law. The current retention schedule by data category is:",
    ],
    points: Object.entries(DATA_RETENTION_POLICY).map(([category, value]) => {
      const unit = /YEARS$/.test(category)
        ? "years"
        : /DAYS$/.test(category)
          ? "days"
          : "months";
      return `${category
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/ years$| days$| months$/, "")}: ${String(value)} ${unit}.`;
    }),
  },
  {
    title: "7. Your rights",
    body: [
      "Under the Nigeria Data Protection Act 2023 you can ask us to: confirm what we hold about you; give you a copy; correct inaccurate data; delete your data where the law allows; object to or restrict certain processing; and withdraw consent where processing is based on consent.",
      "You can do most of this yourself: edit profile and payout details in settings, delete your account from settings (account deletion), and unsubscribe from emails. For anything else, email support@refreeg.com and we will respond within the statutory window. If you are not satisfied, you can complain to the Nigeria Data Protection Commission (NDPC).",
    ],
  },
  {
    title: "8. Security",
    body: [
      "We encrypt data in transit, hash passwords, restrict access to production data to roles that need it, and log administrative actions (including KYC decisions and admin activity) for accountability. No system is perfectly secure; if a breach affects your data, we will notify you and the NDPC as required by law.",
    ],
  },
  {
    title: "9. Children",
    body: [
      "RefreeG is not for anyone under 18. We do not knowingly collect data from children; if we learn we hold data of someone under 18, we delete it.",
    ],
  },
  {
    title: "10. International transfers",
    body: [
      "Some of our providers operate outside Nigeria, so your data may be processed in other countries. We use providers that protect data to standards equivalent to Nigerian law and contract with them accordingly.",
    ],
  },
  {
    title: "11. Changes to this policy",
    body: [
      'We update this policy as the product changes. The "last updated" date at the top always reflects the current version; material changes will be announced on the platform.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
        Legal
      </p>
      <h1 className="mt-3 font-fraunces text-4xl font-medium text-ink sm:text-5xl">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-ink/60">
        Last updated 28 November 2026 · Eiza Innovations Limited (RC 8032815)
      </p>
      <p className="mt-6 text-base leading-7 text-ink/70">
        What we collect, why, who sees it, and how to get it back. Written for
        Nigerian data protection law. Pair it with our{" "}
        <Link
          href="/terms"
          className="font-medium text-blue-accent underline underline-offset-2"
        >
          terms of service
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
            href="/terms"
            className="text-blue-accent underline underline-offset-2"
          >
            Terms of service
          </Link>
          <Link
            href="/crowdfund/fees"
            className="text-blue-accent underline underline-offset-2"
          >
            Fee policy
          </Link>
        </div>
      </div>
    </main>
  );
}
