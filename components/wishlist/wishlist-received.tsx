"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getWishlistGiftByReference } from "@/actions/wishlists/wishlist-actions";
import { usePayment } from "@/hooks/use-payment";
import { formatNaira } from "@/components/giving/format";
import type { WishlistGiftSummary } from "@/types";

const PROVIDER_NAMES: Record<string, string> = {
  paystack: "Paystack",
  flutterwave: "Flutterwave",
};

async function loadGift(reference: string, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    const result = await getWishlistGiftByReference(reference).catch(
      () => null,
    );
    if (result?.success && result.data) return result.data;
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  return null;
}

export interface WishlistReceivedProps {
  username: string;
  slug: string;
  reference?: string;
  txRef?: string;
  transactionId?: string;
  provider?: string;
  cancelled: boolean;
}

export function WishlistReceived({
  username,
  slug,
  reference,
  txRef,
  transactionId,
  provider,
  cancelled,
}: WishlistReceivedProps) {
  const backHref = `/${username}/${slug}`;
  const { verifyPayment } = usePayment();
  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading",
  );
  const [gift, setGift] = useState<WishlistGiftSummary | null>(null);
  const [hasVerified, setHasVerified] = useState(false);
  const [declined, setDeclined] = useState<{
    amount: number | null;
    provider: string;
  }>({ amount: null, provider: "Paystack" });

  useEffect(() => {
    if (hasVerified) return;

    const finalReference = reference || txRef;

    const readPending = () => {
      try {
        const amount = Number(localStorage.getItem("payment_amount"));
        const resolved =
          provider || localStorage.getItem("payment_provider") || "paystack";
        setDeclined({
          amount: Number.isFinite(amount) && amount > 0 ? amount : null,
          provider: PROVIDER_NAMES[resolved] ?? "Paystack",
        });
      } catch {}
    };

    if (cancelled || !finalReference) {
      setHasVerified(true);
      readPending();
      setStatus("failed");
      return;
    }
    setHasVerified(true);

    (async () => {
      try {
        const ok = await verifyPayment(
          finalReference,
          provider as "paystack" | "flutterwave" | undefined,
          transactionId || undefined,
        );
        if (!ok) {
          readPending();
          setStatus("failed");
          return;
        }
        setGift(await loadGift(finalReference));
        setStatus("success");
        try {
          localStorage.removeItem("payment_amount");
        } catch {}
      } catch {
        readPending();
        setStatus("failed");
      }
    })();
  }, [
    cancelled,
    provider,
    reference,
    transactionId,
    txRef,
    verifyPayment,
    hasVerified,
  ]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink/60" />
        <p className="font-fraunces text-2xl text-ink">Confirming your gift</p>
        <p className="text-sm text-ink/60">
          This usually takes a few seconds. Please keep this page open.
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl bg-surface p-7 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest text-lime">
            <Check className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 font-fraunces text-3xl tracking-tight text-ink">
            Your gift went through
          </h1>
          {gift ? (
            <>
              <p className="mt-2 text-sm text-ink/60">
                {gift.giverName} · {gift.wishlistTitle}
              </p>
              <p className="mt-4 font-fraunces text-5xl tracking-tight text-ink">
                {formatNaira(gift.amount)}
              </p>
              <p className="mt-2 text-sm text-ink/60">
                toward{" "}
                <span className="font-semibold text-ink">{gift.itemName}</span>
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink/60">
              It will appear on the wishlist in a moment.
            </p>
          )}
          <div className="mt-6">
            <Link href={backHref}>
              <Button variant="ink" className="h-12 w-full rounded-2xl">
                Back to the wishlist
              </Button>
            </Link>
            <p className="mt-3 text-xs text-ink/50">
              {PROVIDER_NAMES[provider ?? ""] ?? "The provider"} emailed you a
              receipt.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-[452px] rounded-3xl bg-surface p-7">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rust/10 text-rust">
          <AlertCircle className="h-5 w-5" />
        </span>
        <h1 className="mt-5 font-fraunces text-3xl tracking-tight text-ink">
          Your payment didn&apos;t go through
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          {declined.provider} didn&apos;t confirm this payment, so the item has
          not been credited. If money did leave your account, it lands on the
          wishlist once the payment clears.
        </p>
        {declined.amount && (
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-bone px-4 py-3.5 text-sm">
            <span className="text-ink/70">Gift</span>
            <span className="font-semibold text-ink">
              ₦{declined.amount.toLocaleString()}
            </span>
          </div>
        )}
        <div className="mt-6">
          <Link href={backHref}>
            <Button
              variant="ink"
              className="h-12 w-full rounded-2xl font-semibold"
            >
              Back to the wishlist
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
