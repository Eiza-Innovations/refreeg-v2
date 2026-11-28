import crypto from "crypto";
import Flutterwave from "@/services/flutterwave";
import { calculateProviderFee, calculateServiceFee } from "@/lib/utils";
import type {
  FlutterwaveChargeInput,
  FlutterwaveChargeResult,
  FlutterwaveVerifiedTransaction,
} from "@/types/payment-types";

/**
 * Constant-time comparison of the Flutterwave `verif-hash` header against
 * `FLUTTERWAVE_WEBHOOK_HASH` by hashing both values to fixed-length digests.
 */
export function verifyFlutterwaveWebhookHash(
  received: string | null,
  expected: string | undefined,
): boolean {
  if (!received || !expected) {
    return false;
  }

  const receivedDigest = crypto.createHash("sha256").update(received).digest();
  const expectedDigest = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(receivedDigest, expectedDigest);
}

/**
 * Verify a Flutterwave transaction via its numeric ID when available, or
 * fall back to `tx_ref`.
 */
export async function verifyFlutterwaveTransaction(
  txRef: string,
  transactionId?: string | number | null,
): Promise<FlutterwaveVerifiedTransaction | null> {
  if (transactionId !== undefined && transactionId !== null) {
    const cleanId = String(transactionId).trim();
    if (cleanId.length > 0) {
      if (!/^\d+$/.test(cleanId)) {
        throw new Error("Invalid Flutterwave transaction ID");
      }
      return (await Flutterwave.verifyTransactionFull(
        cleanId,
      )) as FlutterwaveVerifiedTransaction | null;
    }
  }

  return (await Flutterwave.verifyByReferenceFull(
    txRef,
  )) as FlutterwaveVerifiedTransaction | null;
}

function parseBooleanMeta(value: unknown): boolean {
  return value === true || String(value).trim().toLowerCase() === "true";
}

// Cross-check the amount Flutterwave actually charged against the total implied
// by the metadata (donation + server-side fees + tip, in naira) within 1 kobo
// rounding tolerance (SAW-013).
function hasExpectedFlutterwaveTotal(
  chargedAmount: number,
  baseAmount: number,
  tipAmount: number,
): { ok: boolean; expectedTotal: number } {
  const expectedTotal =
    baseAmount +
    calculateServiceFee(baseAmount) +
    calculateProviderFee(baseAmount, "flutterwave") +
    tipAmount;

  return {
    ok:
      Number.isFinite(chargedAmount) &&
      Number.isFinite(baseAmount) &&
      baseAmount > 0 &&
      Number.isFinite(tipAmount) &&
      tipAmount >= 0 &&
      Math.abs(
        Math.round(chargedAmount * 100) - Math.round(expectedTotal * 100),
      ) <= 1,
    expectedTotal,
  };
}

/**
 * Shared processor for verified Flutterwave charges (used by both the webhook
 * handler and the payment verification endpoint).
 */
export async function processFlutterwaveCharge({
  txRef,
  transactionId,
  verifiedTransaction,
}: FlutterwaveChargeInput): Promise<FlutterwaveChargeResult> {
  const full =
    verifiedTransaction ??
    (await verifyFlutterwaveTransaction(txRef, transactionId));

  if (!full || full.status !== "successful") {
    return { ok: false, reason: "not_successful" };
  }

  if (!full.tx_ref || String(full.tx_ref) !== txRef) {
    console.error(
      `[Flutterwave] Reference mismatch for ${txRef}: verified transaction belongs to ${full.tx_ref ?? "missing"}`,
    );
    return { ok: false, reason: "reference_mismatch" };
  }

  if (!full.currency || String(full.currency).toUpperCase() !== "NGN") {
    console.error(
      `[Flutterwave] Unexpected currency for ${txRef}: ${full.currency ?? "missing"}`,
    );
    return { ok: false, reason: "currency_mismatch" };
  }

  const meta = full.meta || {};

  if (String(meta.pledge_flow) === "authorization") {
    const { processPledgeAuthorizationSuccess } =
      await import("@/lib/payments/pledge-provider");
    return processPledgeAuthorizationSuccess(txRef, "flutterwave");
  }

  if (String(meta.pledge_flow) === "scheduled_charge") {
    const { processPledgeScheduledChargeSuccess } =
      await import("@/lib/payments/pledge-provider");
    return processPledgeScheduledChargeSuccess(txRef, "flutterwave");
  }

  const donorEmail = String(meta.email || full.customer?.email || "");
  const isAnonymous = parseBooleanMeta(meta.is_anonymous);
  const chargedAmount = Number(full.amount);

  if (meta.wishlist_item_id) {
    const baseAmount = Number(meta.amount);
    const check = hasExpectedFlutterwaveTotal(chargedAmount, baseAmount, 0);

    if (!check.ok) {
      console.error(
        `[Flutterwave] Amount mismatch for ${txRef}: charged ${chargedAmount}, wishlist metadata implies ${check.expectedTotal} - not recording contribution`,
      );
      return { ok: false, reason: "amount_mismatch" };
    }

    const { recordWishlistContribution } =
      await import("@/actions/wishlists/wishlist-actions");
    await recordWishlistContribution(
      String(meta.wishlist_item_id),
      meta.user_id ? String(meta.user_id) : null,
      {
        amount: baseAmount,
        name: String(meta.customer_name || ""),
        email: donorEmail,
        message: String(meta.message || ""),
        isAnonymous,
      },
      txRef,
      "flutterwave",
    );

    return { ok: true, reason: "wishlist_contribution_created" };
  }

  if (!meta.cause_id) {
    return { ok: false, reason: "missing_target_id" };
  }

  const baseAmount = Number(meta.amount);
  const tipAmount = Number(meta.tip_amount || 0);
  const check = hasExpectedFlutterwaveTotal(
    chargedAmount,
    baseAmount,
    tipAmount,
  );

  if (!check.ok) {
    console.error(
      `[Flutterwave] Amount mismatch for ${txRef}: charged ${chargedAmount}, metadata implies ${check.expectedTotal} - not recording donation`,
    );
    return { ok: false, reason: "amount_mismatch" };
  }

  const { createDonation } =
    await import("@/actions/donations/donation-actions");
  await createDonation(
    String(meta.cause_id),
    meta.user_id ? String(meta.user_id) : null,
    {
      amount: baseAmount,
      name: String(meta.customer_name || ""),
      email: donorEmail,
      message: String(meta.message || ""),
      isAnonymous,
      tip_amount: tipAmount,
    },
    undefined,
    txRef,
    "flutterwave",
    meta.ref_v1 ? String(meta.ref_v1) : undefined,
  );

  return { ok: true, reason: "donation_created" };
}
