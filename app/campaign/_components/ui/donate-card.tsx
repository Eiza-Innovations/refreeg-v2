import { motion } from "framer-motion";
import { HandHeart, ShieldAlert, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Skeleton } from "@/components/ui/skeleton";
import { Heading, P, Small, Span } from "@/components/marketing/Typography";
import { BreetCryptoDonationModal } from "@/components/crypto-details/BreetCryptoDonationModal";
import { causePublicPath } from "@/lib/causes/slug";
import type { CauseDetail, ProfileSummary } from "@/types/campaign-view-types";
import { DONATION_PRESETS, fadeUp } from "@/lib/causes/campaign-constants";

const DonationForm = dynamic(
  () =>
    import("@/components/causes/DonationForm").then((mod) => mod.DonationForm),
  {
    loading: () => <Skeleton className="h-[400px] w-full rounded-xl" />,
  },
);

export function DonateCard({
  cause,
  donation,
  setDonation,
  recurring,
  setRecurring,
  tip,
  setTip,
  serviceFee,
  providerFee,
  totalWithTip,
  profile,
}: {
  cause: CauseDetail;
  donation: number;
  setDonation: (value: number) => void;
  recurring: "one_time" | "weekly" | "monthly";
  setRecurring: (value: "one_time" | "weekly" | "monthly") => void;
  tip: number;
  setTip: (value: number) => void;
  serviceFee: number;
  providerFee: number;
  totalWithTip: number;
  profile: ProfileSummary;
}) {
  return (
    <motion.div
      className="overflow-hidden rounded-[20px] border border-hairline bg-surface"
      variants={fadeUp}
    >
      <div className="bg-ink px-4 py-4 text-ink-foreground sm:px-6 sm:py-5">
        <div className="flex items-center justify-between">
          <Eyebrow className="text-lime">Support this campaign</Eyebrow>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-foreground/10 sm:h-9 sm:w-9">
            <HandHeart className="h-4 w-4 text-lime" />
          </span>
        </div>
        <Heading
          as="h3"
          size="panel"
          className="mt-1.5 font-medium text-ink-foreground sm:mt-2"
        >
          Make a donation
        </Heading>
        <Small className="mt-1.5 hidden text-ink-foreground/60 sm:block">
          Secure checkout · Publicly audited milestones
        </Small>
      </div>

      <div className="space-y-3 p-4 sm:p-6 [&_input]:h-10 [&_input]:rounded-xl [&_input]:border-hairline sm:[&_input]:h-11 [&_label]:text-sm [&_label]:text-ink [&_textarea]:rounded-xl [&_textarea]:border-hairline">
        <DonationForm
          causeId={cause.id}
          profile={profile}
          status={cause.status}
          subaccount={cause?.user.sub_account_code ?? undefined}
          flutterwaveSubAccountId={
            cause?.user.flutterwave_sub_account_id ?? undefined
          }
          causeName={cause.title}
          causeUrl={causePublicPath(cause)}
          recurring={recurring}
          tip={tip}
          onTipChange={setTip}
          initialAmount={donation}
          hideHeader
          hideAmountField
          hideCheckoutSummary
          flush
          compactOptionalFields
          submitLabel="Donate"
          submitClassName="h-11 rounded-xl bg-lime text-sm font-semibold text-lime-foreground hover:bg-lime/90 disabled:opacity-50 sm:h-12"
          beforeFields={
            <>
              <div className="grid grid-cols-2 gap-2">
                {DONATION_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setDonation(amount)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest sm:py-2.5 ${
                      donation === amount
                        ? "border-forest bg-forest/10 text-forest"
                        : "border-hairline bg-surface text-ink/70 hover:border-ink/40"
                    }`}
                  >
                    ₦{amount.toLocaleString()}
                  </button>
                ))}
              </div>

              <label className="grid gap-2 text-sm">
                <Eyebrow className="text-ink/60">Donation amount</Eyebrow>
                <div className="flex items-stretch overflow-hidden rounded-xl border border-hairline bg-surface">
                  <span className="flex items-center justify-center bg-ink px-4 text-sm font-bold text-ink-foreground">
                    ₦
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    value={donation ? donation.toLocaleString("en-US") : ""}
                    onChange={(event) => {
                      const next = event.target.value.replace(/\D/g, "");
                      const capped = next.slice(0, 12);
                      setDonation(capped ? Number(capped) : 0);
                    }}
                    className="min-w-0 flex-1 appearance-none bg-transparent px-3 py-2 text-right text-lg font-bold tabular-nums text-ink outline-none"
                    placeholder="Enter amount"
                    aria-label="Donation amount"
                  />
                </div>
                <Small className="hidden text-ink/60 sm:block">
                  This is the amount that goes toward the campaign.
                </Small>
              </label>
            </>
          }
          afterFields={
            <div className="rounded-2xl bg-bone p-3 sm:p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-ink">
                <Span className="text-sm text-ink">Campaign receives</Span>
                <Span className="text-sm tabular-nums text-ink">
                  ₦{donation.toLocaleString()}
                </Span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
                <Span className="text-sm font-bold text-ink">
                  Checkout total
                </Span>
                <Span className="font-fraunces text-xl font-medium tabular-nums text-ink">
                  ₦{totalWithTip.toLocaleString()}
                </Span>
              </div>
              {(serviceFee > 0 || tip > 0) && (
                <details className="group mt-3 border-t border-hairline pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-ink/70">
                    View breakdown
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 grid gap-1.5 text-xs text-ink/60">
                    <div className="flex justify-between">
                      <span>Service fee</span>
                      <span>₦{serviceFee.toLocaleString()}</span>
                    </div>
                    {providerFee > 0 && (
                      <div className="flex justify-between">
                        <span>Payment processing</span>
                        <span>₦{providerFee.toLocaleString()}</span>
                      </div>
                    )}
                    {tip > 0 && (
                      <div className="flex justify-between">
                        <span>Platform tip</span>
                        <span>₦{tip.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          }
        />

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-hairline" />
          <Eyebrow className="text-ink/50">Or use crypto</Eyebrow>
          <span className="h-px flex-1 bg-hairline" />
        </div>
        <BreetCryptoDonationModal
          causeId={cause.id}
          donorId={profile.id || null}
          triggerLabel="Donate with USDT"
          triggerClassName="h-11 w-full gap-x-2 rounded-xl border-hairline bg-surface text-sm font-semibold text-ink shadow-none hover:border-ink/40 hover:bg-bone sm:h-12"
        />
      </div>

      <div className="mx-4 mb-4 flex items-start gap-2 border-t border-hairline pt-3 text-xs leading-5 text-ink/60 sm:mx-6 sm:mb-5 sm:pt-4">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
        <P className="text-ink/60 md:text-xs">
          Donations below ₦5 do not earn EIZA. Refunds or chargebacks remove
          rewards.
        </P>
      </div>

      {!profile.id && (
        <div className="mx-4 mb-4 flex items-center justify-between rounded-xl border border-hairline bg-bone px-4 py-3 text-xs text-ink/70 sm:mx-6 sm:mb-5">
          <Span className="text-xs text-ink/70">Guest checkout</Span>
          <Badge variant="verified">Enabled</Badge>
        </div>
      )}
    </motion.div>
  );
}
