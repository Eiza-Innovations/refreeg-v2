import Link from "next/link";
import {
  AlertCircle,
  Globe,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DATA_RETENTION_POLICY } from "@/lib/config/retention";

export const metadata = {
  title: "Delete Your Account | RefreeG",
  description:
    "Instructions for deleting your RefreeG account and understanding what personal data is deleted and how financial records are anonymized.",
};

export default function DeleteAccountInfoPage() {
  return (
    <div className="min-h-screen bg-cream px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <Card variant="surface" className="shadow-none">
          <CardContent className="p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-rust/10 p-3 text-rust">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <Eyebrow className="text-ink/45">Privacy &amp; Data</Eyebrow>
                <h1 className="font-fraunces text-2xl text-ink sm:text-3xl">
                  RefreeG Account &amp; Data Deletion
                </h1>
              </div>
            </div>
            <p className="leading-relaxed text-ink/70">
              You can permanently delete your RefreeG account and personal data
              at any time directly from the RefreeG mobile app or the RefreeG
              website.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card variant="surface" className="shadow-none">
            <CardContent className="p-6">
              <div className="mb-3 flex items-center gap-2 font-semibold text-ink">
                <Smartphone className="h-5 w-5 text-blue-accent" />
                <h2>In the RefreeG Mobile App</h2>
              </div>
              <ol className="list-inside list-decimal space-y-2 text-sm text-ink/70">
                <li>Sign in to the RefreeG mobile app.</li>
                <li>
                  Open the <strong>You</strong> tab from the bottom navigation
                  bar.
                </li>
                <li>
                  Scroll to the bottom and tap <strong>Delete account</strong>.
                </li>
                <li>
                  Confirm your choice in the dialog to permanently delete your
                  account.
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card variant="surface" className="shadow-none">
            <CardContent className="p-6">
              <div className="mb-3 flex items-center gap-2 font-semibold text-ink">
                <Globe className="h-5 w-5 text-blue-accent" />
                <h2>On the RefreeG Website</h2>
              </div>
              <ol className="mb-4 list-inside list-decimal space-y-2 text-sm text-ink/70">
                <li>Sign in to your account at refreeg.com.</li>
                <li>
                  Go to{" "}
                  <strong>Dashboard &rarr; Settings &rarr; Security</strong> (or
                  click <strong>Close account</strong> in the Settings menu).
                </li>
                <li>
                  Open the <strong>Delete Account</strong> section and click{" "}
                  <strong>Delete Account</strong>.
                </li>
              </ol>
              <Button asChild variant="rust" size="sm">
                <Link href="/dashboard/settings/account">
                  Go to Account Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card variant="surface" className="shadow-none">
          <CardContent className="space-y-6 p-8">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-forest" />
              <div>
                <h2 className="mb-2 font-fraunces text-lg text-ink">
                  What Data Is Permanently Deleted Immediately
                </h2>
                <ul className="list-inside list-disc space-y-1.5 text-sm text-ink/70">
                  <li>
                    Your profile information (full name, username, email
                    address, phone number, bio, profile photo, and social links)
                  </li>
                  <li>
                    KYC verification records, uploaded government ID images,
                    live selfie files in cloud storage, and Didit verification
                    sessions
                  </li>
                  <li>
                    Saved payout bank details, saved payment card tokens, and
                    push notification device tokens
                  </li>
                  <li>
                    Comments, petitions, bookmarks, saved searches, and unfunded
                    campaigns
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-hairline pt-4">
              <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-gold-foreground" />
              <div>
                <h2 className="mb-2 font-fraunces text-lg text-ink">
                  What Financial Records Are Anonymized &amp; Retained
                </h2>
                <p className="mb-2 text-sm leading-relaxed text-ink/70">
                  To comply with financial audit, tax, and anti-fraud
                  regulations, historical transaction records (donations,
                  recurring pledges, and crypto donation settlements) are{" "}
                  <strong>anonymized rather than deleted</strong>:
                </p>
                <ul className="list-inside list-disc space-y-1.5 text-sm text-ink/70">
                  <li>
                    Your user ID is unlinked, your name is replaced with{" "}
                    <code>
                      {DATA_RETENTION_POLICY.DELETED_ACCOUNT_DISPLAY_NAME}
                    </code>
                    , and your email is replaced with a non-identifiable
                    placeholder.
                  </li>
                  <li>
                    Anonymized financial ledger entries are retained for{" "}
                    <strong>
                      {DATA_RETENTION_POLICY.FINANCIAL_RECORDS_RETENTION_YEARS}{" "}
                      years
                    </strong>
                    .
                  </li>
                  <li>
                    If you have an active, unpaused campaign that has raised
                    funds, you must pause or close that campaign before deleting
                    your account.
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-ink/60">
          Need help or unable to sign in? Email{" "}
          <a
            href={`mailto:${DATA_RETENTION_POLICY.SUPPORT_EMAIL}?subject=Account%20Deletion%20Request`}
            className="font-medium text-blue-accent hover:underline"
          >
            {DATA_RETENTION_POLICY.SUPPORT_EMAIL}
          </a>{" "}
          or review our{" "}
          <Link
            href="/privacy"
            className="font-medium text-blue-accent hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
