"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { HandHeart, ShieldAlert } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FieldError } from "@/components/ui/field-error";
import { Progress } from "@/components/ui/progress";
import {
  Heading,
  P,
  Small,
  Span,
  Strong,
} from "@/components/marketing/Typography";
import { usePledgeForm } from "@/hooks/use-pledge-form";
import { fadeUp } from "@/lib/causes/campaign-constants";
import { PLEDGE_VERIFICATION_AMOUNT_NGN } from "@/lib/payments/pledge-constants";
import { goalPercent } from "@/lib/progress";
import { getMediaUrl } from "@/lib/s3/media";
import {
  getMaxPledgeDate,
  getMinPledgeDate,
  pledgePresets,
} from "@/lib/schemas/pledge.schema";
import type { PledgeScreenProps } from "@/types/campaign-view-types";

function StatItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface px-3 py-2 text-sm shadow-subtle">
      <span className="text-ink/60">{icon}</span>
      <div>
        <Eyebrow className="text-ink/50">{label}</Eyebrow>
        <Small className="block font-semibold text-ink">{value}</Small>
      </div>
    </div>
  );
}

export default function PledgeScreen({ cause, profile }: PledgeScreenProps) {
  const {
    form,
    setFormFields,
    amountInput,
    handleAmountChange,
    handleAmountBlur,
    handleAmountFocus,
    handlePresetClick,
    errors,
    submission,
    paymentLoading,
    busy,
    handleSubmit,
    handleRetryPaystack,
  } = usePledgeForm({
    causeId: cause.id,
    causeTitle: cause.title,
    defaultName: profile.name,
    defaultEmail: profile.email,
  });

  const percent = goalPercent(
    Number(cause.raised || 0),
    Number(cause.goal || 0),
  );

  return (
    <div className="min-h-screen bg-cream pb-24 text-ink sm:pb-12">
      <div className="border-b border-hairline bg-surface/80 py-8 sm:py-12">
        <div className="container px-4">
          <motion.div
            className="space-y-6"
            initial="hidden"
            animate="show"
            variants={fadeUp}
          >
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="forest" className="gap-1.5 px-3 py-1">
                <HandHeart className="h-3.5 w-3.5" />
                Pledge
              </Badge>
            </div>

            <div className="space-y-3">
              <Heading
                as="h1"
                size="subsection"
                className="font-medium lg:text-5xl"
              >
                Pledge now, donate later.
              </Heading>
              <P className="max-w-2xl text-ink/70 sm:text-base lg:text-lg">
                {cause.summary ||
                  "Make a pledge, save your card on Paystack, and your donation is charged on the date you pick."}
              </P>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-ink/70">
              <StatItem
                icon={<HandHeart className="h-4 w-4 text-forest" />}
                label="Campaign"
                value="Verified"
              />
              <StatItem
                icon={<ShieldAlert className="h-4 w-4 text-amber" />}
                label="Reminder"
                value="Email"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <main className="container grid gap-6 px-4 pt-6 sm:pt-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="order-2 space-y-6 lg:order-1">
          <motion.div
            className="rounded-xl border border-hairline bg-surface p-4 text-sm text-ink/80 sm:p-6"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <Eyebrow>Story</Eyebrow>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink/60">
                <Span className="text-xs text-ink/60">Created by</Span>
                <Span className="text-xs font-medium text-ink">
                  {cause.user.name}
                </Span>
                <Span className="text-hairline">•</Span>
                <Span className="text-xs capitalize text-ink/60">
                  {cause.category}
                </Span>
              </div>
              {cause.description ? (
                <P className="whitespace-pre-line text-ink/70 md:text-sm">
                  {cause.description}
                </P>
              ) : cause.summary ? (
                <P className="text-ink/70 md:text-sm">{cause.summary}</P>
              ) : (
                <P className="text-ink/60 md:text-sm">
                  No story yet. The campaign creator can add the full context
                  and plan here.
                </P>
              )}
            </div>
          </motion.div>

          <motion.div
            className="rounded-xl border border-hairline bg-surface p-4 sm:p-6"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <Eyebrow>Pledge</Eyebrow>
              <HandHeart className="h-4 w-4 text-forest" />
            </div>

            <Heading as="h3" size="panel" className="mt-3 font-medium">
              Pledge to donate later
            </Heading>
            <P className="mt-2 text-ink/70 md:text-sm">
              Set a date, enter your card on Paystack, and we charge your full
              pledge on that day, automatically sent to the cause.
            </P>

            <div className="mt-4 space-y-1.5 rounded-xl border border-hairline bg-bone px-4 py-3 text-sm text-ink">
              <P className="font-semibold text-ink md:text-sm">How it works</P>
              <div className="flex justify-between">
                <Span className="text-sm text-ink/70">
                  Card verification charge (paid now)
                </Span>
                <Span className="text-sm font-semibold tabular-nums text-ink">
                  ₦{PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()}
                </Span>
              </div>
              <div className="flex justify-between">
                <Span className="text-sm text-ink/70">
                  Pledge amount charged on {form.date || "your date"}
                </Span>
                <Span className="text-sm font-semibold tabular-nums text-ink">
                  ₦{form.amount > 0 ? form.amount.toLocaleString() : "0"}
                </Span>
              </div>
              <Small className="block pt-0.5 text-ink/60">
                Paystack will show ₦
                {PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()} on checkout:
                that is the card verification only. Your pledge of ₦
                {form.amount > 0 ? form.amount.toLocaleString() : "0"} is
                charged on {form.date || "the date you pick"}.
              </Small>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 rounded-xl border border-hairline bg-bone px-4 py-3 text-sm">
                <Eyebrow className="text-ink/60">Pledge amount</Eyebrow>
                <div className="flex flex-wrap gap-2">
                  {pledgePresets.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handlePresetClick(value)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
                        form.amount === value
                          ? "border-forest bg-forest text-forest-foreground"
                          : "border-hairline bg-surface text-ink/70 hover:border-ink/40"
                      }`}
                    >
                      ₦{value.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2">
                  <Span className="text-sm font-semibold text-ink/60">₦</Span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    value={amountInput}
                    onChange={handleAmountChange}
                    onBlur={handleAmountBlur}
                    onFocus={handleAmountFocus}
                    className="w-full bg-transparent text-right text-sm text-ink outline-none"
                    placeholder="0"
                  />
                </div>
                <FieldError message={errors.amount} />
                <Small className="text-ink/60">
                  Choose the amount you plan to donate later.
                </Small>
              </label>

              <label className="grid gap-2 rounded-xl border border-hairline bg-bone px-4 py-3 text-sm">
                <Eyebrow className="text-ink/60">Reminder date</Eyebrow>
                <input
                  type="date"
                  value={form.date}
                  min={getMinPledgeDate()}
                  max={getMaxPledgeDate(cause.days_active)}
                  onChange={(event) =>
                    setFormFields("date", event.target.value)
                  }
                  className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none"
                />
                <FieldError message={errors.date} />
                <Small className="text-ink/60">
                  Today, tomorrow, or any later day (not in the past).
                  {cause.days_active
                    ? " Latest: last day of the campaign window."
                    : ""}{" "}
                  We will use this date for the charge / reminder. SMS can be
                  added later.
                </Small>
              </label>

              <label className="grid gap-2 rounded-xl border border-hairline bg-bone px-4 py-3 text-sm">
                <Eyebrow className="text-ink/60">Email</Eyebrow>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setFormFields("email", event.target.value)
                  }
                  placeholder="you@example.com"
                  className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none"
                />
                <FieldError message={errors.email} />
              </label>

              <label className="grid gap-2 rounded-xl border border-hairline bg-bone px-4 py-3 text-sm">
                <Eyebrow className="text-ink/60">Name</Eyebrow>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setFormFields("name", event.target.value)
                  }
                  placeholder="Your name"
                  className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none"
                />
                <FieldError message={errors.name} />
                <Small className="text-ink/60">
                  We will only email about this pledge.
                </Small>
              </label>

              <label className="grid gap-2 rounded-xl border border-hairline bg-bone px-4 py-3 text-sm">
                <Eyebrow className="text-ink/60">Message (optional)</Eyebrow>
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(event) =>
                    setFormFields("note", event.target.value)
                  }
                  placeholder="Add a note to the organiser"
                  className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none"
                />
              </label>
            </div>

            {submission.error && (
              <div
                className="mt-4 rounded-xl border border-rust/30 bg-rust/10 px-4 py-3 text-sm text-rust"
                role="alert"
              >
                {submission.error}
              </div>
            )}

            {submission.submitted && (
              <div
                className="mt-4 rounded-xl border border-forest/30 bg-forest/10 px-4 py-3 text-sm text-forest"
                aria-live="polite"
              >
                Redirecting to Paystack… If nothing opens, use the button below.
              </div>
            )}

            {submission.pledgeId && submission.error?.includes("Paystack") && (
              <Button
                type="button"
                variant="surface"
                onClick={handleRetryPaystack}
                disabled={paymentLoading}
                className="mt-4 h-11 w-full rounded-xl"
              >
                {paymentLoading ? "Opening Paystack…" : "Continue to Paystack"}
              </Button>
            )}

            <Button
              type="button"
              variant="lime"
              onClick={handleSubmit}
              disabled={busy}
              className="mt-4 h-11 w-full rounded-xl"
            >
              {busy
                ? "Working…"
                : `Save pledge & verify card (₦${PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()} now)`}
            </Button>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber/30 bg-sand/40 px-4 py-3 text-sm text-ink">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
              <Span className="text-sm text-ink/80">
                Paystack checkout will show{" "}
                <Strong className="text-ink">
                  ₦{PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()}
                </Strong>
                . This is only a card-save verification. Your actual pledge of{" "}
                <Strong className="text-ink">
                  ₦{form.amount > 0 ? form.amount.toLocaleString() : "0"}
                </Strong>{" "}
                will be charged on{" "}
                <Strong className="text-ink">
                  {form.date || "your chosen date"}
                </Strong>
                .
              </Span>
            </div>
          </motion.div>
        </section>

        <aside className="order-1 space-y-6 lg:order-2">
          <motion.div
            className="rounded-xl border border-hairline bg-surface p-4 text-sm text-ink/70 sm:p-6"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <Eyebrow>Campaign</Eyebrow>
            <div className="mt-3 flex items-start gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-cream-muted">
                {cause.image ? (
                  <Image
                    src={getMediaUrl(cause.image) || "/icons/placeholder.svg"}
                    alt={cause.title}
                    fill
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div>
                <P className="font-semibold text-ink md:text-base">
                  {cause.title}
                </P>
                {cause.location ? (
                  <Small className="mt-1 block text-ink/60">
                    {cause.location}
                  </Small>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-hairline bg-bone p-3 text-xs text-ink/70">
              <div className="flex items-center justify-between">
                <Span className="text-xs text-ink/60">Raised</Span>
                <Span className="text-xs font-semibold tabular-nums text-ink">
                  ₦{Number(cause.raised || 0).toLocaleString()}
                </Span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Span className="text-xs text-ink/60">Goal</Span>
                <Span className="text-xs font-semibold tabular-nums text-ink">
                  ₦{Number(cause.goal || 0).toLocaleString()}
                </Span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Span className="text-xs text-ink/60">Progress</Span>
                <Span className="text-xs font-semibold tabular-nums text-forest">
                  {percent}%
                </Span>
              </div>
              <Progress
                value={percent}
                className="mt-3 h-2 bg-cream-muted [&>div]:bg-forest"
              />
            </div>

            <div className="mt-4 rounded-lg border border-hairline bg-bone p-3 text-xs text-ink/70">
              <Small className="block font-semibold text-ink">Organizer</Small>
              <Small className="mt-1 block text-ink/70">
                {cause.user.name}
              </Small>
            </div>
          </motion.div>

          <motion.div
            className="rounded-xl border border-hairline bg-surface p-4 text-sm text-ink/70 sm:p-6"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <Eyebrow>What happens next</Eyebrow>
            <P className="mt-3 text-ink/70 md:text-sm">
              After your card is saved, you will get a confirmation email. On
              your reminder date we charge the full pledge automatically; you
              will receive a receipt when it succeeds.
            </P>
          </motion.div>
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface px-4 py-3 shadow-elevated sm:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Button
            type="button"
            variant="ink"
            onClick={handleSubmit}
            disabled={busy}
            className="h-11 flex-1 rounded-full"
          >
            {busy ? "Working…" : "Save & Paystack"}
          </Button>
        </div>
      </div>
    </div>
  );
}
