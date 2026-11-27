"use client";

import { useMemo, useState } from "react";
import { Check, CreditCard, Landmark, X } from "lucide-react";

import { Dialog, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDialogContent } from "@/components/ui/responsive-dialog-content";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Icons } from "@/components/layout/Icons";
import { usePayment } from "@/hooks/use-payment";
import { useValidator } from "@/hooks/use-validator";
import { rememberAbandonedGift } from "@/lib/wishlist/gift-reminder";
import {
  WISHLIST_CONTRIBUTION_MIN,
  wishlistContributionSchema,
} from "@/lib/schemas/wishlist.schema";
import { calculateProviderFee, calculateServiceFee, cn } from "@/lib/utils";
import { formatNaira } from "@/components/giving/format";
import type { WishlistItem } from "@/types";

type Provider = "paystack" | "flutterwave";

const PRESETS = [1000, 2500, 5000, 10000];

const PROVIDERS: {
  id: Provider;
  label: string;
  detail: string;
  Icon: typeof CreditCard;
}[] = [
  {
    id: "paystack",
    label: "Card, transfer or USSD",
    detail: "Paystack",
    Icon: CreditCard,
  },
  {
    id: "flutterwave",
    label: "Card or bank transfer",
    detail: "Flutterwave",
    Icon: Landmark,
  },
];

const label =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55";

export interface ContributeSheetProps {
  item: WishlistItem;
  wishlistTitle: string;
  wishlistSlug: string;
  ownerUsername: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewer: { id: string; name: string; email: string } | null;
}

export function ContributeSheet({
  item,
  wishlistTitle,
  wishlistSlug,
  ownerUsername,
  open,
  onOpenChange,
  viewer,
}: ContributeSheetProps) {
  const { initializePayment, isLoading } = usePayment();
  const [stage, setStage] = useState<"form" | "confirm">("form");
  const [form, setForm] = useState({
    preset: 2500 as number | "other",
    other: "",
    provider: "paystack" as Provider,
    name: "",
    email: "",
    message: "",
    isAnonymous: false,
  });

  const amount =
    form.preset === "other" ? Number(form.other) || 0 : form.preset;
  const remaining = Math.max(item.price - item.contributed, 0);
  const { errors, validate, clearError, setErrors } = useValidator({
    store: {
      amount,
      name: viewer?.name || form.name,
      email: viewer?.email || form.email,
      message: form.message,
      isAnonymous: form.isAnonymous,
    },
    schema: wishlistContributionSchema,
  });

  const fees = useMemo(
    () =>
      calculateServiceFee(amount) + calculateProviderFee(amount, form.provider),
    [amount, form.provider],
  );

  const setField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const giverName =
    form.isAnonymous || !(viewer?.name || form.name).trim()
      ? "Anonymous"
      : (viewer?.name || form.name).trim();

  const review = () => {
    if (amount > remaining) {
      setErrors((current) => ({
        ...current,
        amount: `This item only needs ₦${remaining.toLocaleString()} more.`,
      }));
      return;
    }
    if (!validate()) return;
    setStage("confirm");
  };

  const give = async () => {
    try {
      await initializePayment({
        email: (viewer?.email || form.email).trim(),
        amount,
        wishlistItemId: item.id,
        id: viewer?.id || "",
        full_name: giverName === "Anonymous" ? "" : giverName,
        serviceFee: calculateServiceFee(amount),
        paymentProvider: form.provider,
        subaccounts: [],
        message: form.message.trim(),
        isAnonymous: form.isAnonymous,
        callbackUrl: `${window.location.origin}/${ownerUsername}/${wishlistSlug}/received`,
      });
    } catch {}
  };

  const close = (next: boolean) => {
    if (!next) {
      setStage("form");
      const giverEmail = (viewer?.email || form.email).trim();
      if (giverEmail) {
        rememberAbandonedGift({
          email: giverEmail,
          giverName: giverName === "Anonymous" ? "" : giverName,
          itemName: item.name,
          wishlistTitle,
          wishlistUrl: `${window.location.origin}/${ownerUsername}/${wishlistSlug}`,
          attemptedAt: new Date().toISOString(),
        });
      }
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <ResponsiveDialogContent className="max-h-[92vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-none bg-transparent p-0 shadow-none sm:max-w-[452px] [&>button]:hidden">
        <DialogTitle className="sr-only">
          {stage === "form" ? `Give toward ${item.name}` : "Confirm your gift"}
        </DialogTitle>

        {stage === "form" ? (
          <div className="rounded-3xl bg-surface p-6 sm:p-7">
            <div className="flex items-start gap-4 border-b border-hairline pb-5">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink/55">{wishlistTitle}</p>
                <p className="mt-0.5 font-semibold leading-snug text-ink">
                  {item.name}
                </p>
              </div>
              <DialogClose
                className="rounded-full p-1 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </DialogClose>
            </div>

            <p className={cn(label, "mt-5")}>Amount</p>
            <div
              className="mt-3 grid grid-cols-5 gap-2"
              role="radiogroup"
              aria-label="Choose an amount"
            >
              {[...PRESETS, "other" as const].map((value) => {
                const over = value !== "other" && value > remaining;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={form.preset === value}
                    disabled={over}
                    onClick={() => {
                      setField("preset", value);
                      clearError("amount");
                    }}
                    className={cn(
                      "h-11 rounded-xl border text-[13px] font-semibold transition-colors",
                      form.preset === value
                        ? "border-ink bg-ink text-ink-foreground"
                        : "border-hairline bg-surface text-ink hover:border-ink/30",
                      "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-hairline",
                    )}
                  >
                    {value === "other"
                      ? "Other"
                      : value >= 1000
                        ? `₦${value / 1000}k`
                        : `₦${value}`}
                  </button>
                );
              })}
            </div>
            {remaining < WISHLIST_CONTRIBUTION_MIN && (
              <p className="mt-2 text-[13px] leading-5 text-ink/55">
                Only ₦{remaining.toLocaleString()} of this goal is left, smaller
                than the ₦{WISHLIST_CONTRIBUTION_MIN} minimum, so this item
                can&apos;t take another gift.
              </p>
            )}
            {form.preset === "other" && (
              <input
                type="number"
                inputMode="numeric"
                min={WISHLIST_CONTRIBUTION_MIN}
                autoFocus
                value={form.other}
                onChange={(e) => {
                  setField("other", e.target.value);
                  clearError("amount");
                }}
                placeholder="Amount in naira"
                aria-label="Amount in naira"
                className="mt-2.5 h-12 w-full rounded-xl border border-hairline bg-bone px-4 text-[15px] text-ink outline-none focus:border-ink/40"
              />
            )}
            {errors.amount && (
              <p className="mt-2 text-sm font-medium text-rust" role="alert">
                {errors.amount}
              </p>
            )}

            {!viewer && !form.isAnonymous && (
              <div className="mt-5">
                <input
                  value={form.name}
                  onChange={(e) => {
                    setField("name", e.target.value);
                    clearError("name");
                  }}
                  placeholder="Your name"
                  aria-label="Your name"
                  className="h-11 w-full rounded-xl border border-hairline bg-bone px-4 text-sm text-ink outline-none focus:border-ink/40"
                />
                {errors.name && (
                  <p
                    className="mt-1.5 text-sm font-medium text-rust"
                    role="alert"
                  >
                    {errors.name}
                  </p>
                )}
              </div>
            )}
            {!viewer && (
              <div className={form.isAnonymous ? "mt-5" : "mt-2.5"}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setField("email", e.target.value);
                    clearError("email");
                  }}
                  placeholder="Email for your receipt"
                  aria-label="Email for your receipt"
                  className="h-11 w-full rounded-xl border border-hairline bg-bone px-4 text-sm text-ink outline-none focus:border-ink/40"
                />
                {errors.email && (
                  <p
                    className="mt-1.5 text-sm font-medium text-rust"
                    role="alert"
                  >
                    {errors.email}
                  </p>
                )}
              </div>
            )}
            {viewer && errors.email && (
              <p className="mt-2 text-sm font-medium text-rust" role="alert">
                {errors.email}
              </p>
            )}

            <div className="mt-5 flex items-start justify-between gap-4 rounded-2xl border border-hairline p-3.5">
              <div>
                <p className="text-sm font-semibold text-ink">
                  Give anonymously
                </p>
                <p className="mt-0.5 text-[13px] leading-5 text-ink/55">
                  Hide your name publicly. The owner still sees your contact so
                  they can thank you.
                </p>
              </div>
              <Switch
                checked={form.isAnonymous}
                onCheckedChange={(checked) => setField("isAnonymous", checked)}
                aria-label="Give anonymously"
              />
            </div>

            <label htmlFor="gift-message" className={cn(label, "mt-5 block")}>
              Message{" "}
              <span className="normal-case text-ink/40">(optional)</span>
            </label>
            <textarea
              id="gift-message"
              value={form.message}
              maxLength={280}
              rows={2}
              onChange={(e) => setField("message", e.target.value)}
              placeholder="Say something to the person you're gifting."
              className="mt-2 w-full rounded-xl border border-hairline bg-bone px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
            />
            {errors.message && (
              <p className="mt-2 text-sm font-medium text-rust" role="alert">
                {errors.message}
              </p>
            )}

            <p className={cn(label, "mt-5")}>Pay with</p>
            <div
              className="mt-3 space-y-2.5"
              role="radiogroup"
              aria-label="Pay with"
            >
              {PROVIDERS.map(({ id, label: title, detail, Icon }) => {
                const selected = form.provider === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setField("provider", id)}
                    className={cn(
                      "flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-colors",
                      selected
                        ? "border-blue-accent bg-blue-accent/[0.03]"
                        : "border-hairline hover:border-ink/30",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        selected
                          ? "bg-ink text-ink-foreground"
                          : "bg-bone text-ink/70",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">
                        {title}
                      </span>
                      <span className="block text-[13px] text-ink/55">
                        {detail}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border",
                        selected
                          ? "border-blue-accent bg-blue-accent text-white"
                          : "border-hairline",
                      )}
                    >
                      {selected && (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <Button
              variant="ink"
              onClick={review}
              disabled={isLoading || amount < WISHLIST_CONTRIBUTION_MIN}
              className="mt-6 h-14 w-full rounded-2xl text-base font-semibold"
            >
              Review gift
            </Button>
            {amount >= WISHLIST_CONTRIBUTION_MIN && fees > 0 && (
              <p className="mt-2 text-center text-xs text-ink/55">
                {formatNaira(amount + fees)} total, including{" "}
                {formatNaira(fees)} in fees
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-3xl bg-surface p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-hairline pb-5">
              <Eyebrow className="text-forest">Confirm your gift</Eyebrow>
              <DialogClose
                className="rounded-full p-1 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </DialogClose>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink/55">Gift</dt>
                <dd className="font-semibold text-ink">{item.name}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink/55">Amount</dt>
                <dd className="font-semibold text-ink">
                  {formatNaira(amount)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink/55">Fees</dt>
                <dd className="text-ink">{formatNaira(fees)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-3">
                <dt className="text-ink/55">You pay</dt>
                <dd className="font-fraunces text-xl font-medium text-ink">
                  {formatNaira(amount + fees)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink/55">From</dt>
                <dd className="text-ink">{giverName}</dd>
              </div>
              {form.message.trim() && (
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-ink/55">Note</dt>
                  <dd className="text-right italic text-ink">
                    “{form.message.trim()}”
                  </dd>
                </div>
              )}
            </dl>

            <Button
              variant="lime"
              onClick={give}
              disabled={isLoading}
              aria-busy={isLoading}
              className="mt-6 h-14 w-full rounded-2xl text-base font-semibold text-ink shadow-[0_10px_24px_-10px_hsl(var(--forest)/0.6)]"
            >
              {isLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Opening payment…
                </>
              ) : (
                `Give ${formatNaira(amount)}`
              )}
            </Button>
            <button
              type="button"
              onClick={() => setStage("form")}
              className="mt-3 w-full text-center text-[13px] font-semibold text-blue-accent hover:underline"
            >
              Back to edit
            </button>
          </div>
        )}
      </ResponsiveDialogContent>
    </Dialog>
  );
}
