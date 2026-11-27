import { createDonation } from "@/actions/donations/donation-actions";
import { verifyTransactionFull } from "@/services/payment-provider";
import { calculateProviderFee, calculateServiceFee } from "@/lib/utils";
import {
  processPledgeAuthorizationSuccess,
  processPledgeScheduledChargeSuccess,
} from "@/lib/payments/pledge-provider";

type ChargeResult =
  { ok: true; reason: string } | { ok: false; reason: string };

// Cross-check the amount the provider actually charged against the total the
// server-side fee formulas imply from the metadata. metadata.amount is the
// giver's chosen amount in naira; the provider reports the charged total in
// kobo. A mismatch means the transaction does not match what was initialized,
// so the charge is left for manual review rather than recorded (SAW-013).
function expectedKoboFor(
  full: { amount?: number },
  giftNaira: number,
  tipNaira: number,
): { ok: boolean; chargedKobo: number } {
  const expectedTotalKobo = Math.round(
    (giftNaira +
      calculateServiceFee(giftNaira) +
      calculateProviderFee(giftNaira, "paystack") +
      tipNaira) *
      100,
  );
  const chargedKobo = Number(full.amount);

  return {
    ok:
      Number.isFinite(chargedKobo) &&
      Number.isFinite(giftNaira) &&
      chargedKobo === expectedTotalKobo,
    chargedKobo,
  };
}

export async function processSuccessfulCharge(
  reference: string,
): Promise<ChargeResult> {
  const full = (await verifyTransactionFull(reference, "paystack")) as {
    status?: string;
    amount?: number;
    metadata?: Record<string, string | number | boolean | undefined>;
  };

  if (full.status !== "success") {
    return { ok: false, reason: "not_success" };
  }

  const meta = full.metadata || {};

  if (String(meta.pledge_flow) === "authorization") {
    return processPledgeAuthorizationSuccess(reference, "paystack");
  }

  if (String(meta.pledge_flow) === "scheduled_charge") {
    return processPledgeScheduledChargeSuccess(reference, "paystack");
  }

  // Wishlist gifts ride the same rails but land in their own ledger, so the
  // branch must come before the cause_id guard.
  if (meta.wishlist_item_id) {
    const giftNaira = Number(meta.amount);
    const check = expectedKoboFor(full, giftNaira, 0);

    if (!check.ok) {
      console.error(
        `[Paystack] Amount mismatch for ${reference}: charged ${check.chargedKobo} kobo, wishlist metadata implies a different total - not recording contribution`,
      );
      return { ok: false, reason: "amount_mismatch" };
    }

    // Dynamic import keeps the auth/prisma graph out of every consumer of
    // this module (the donation path does the same for referral attribution).
    const { recordWishlistContribution } =
      await import("@/actions/wishlists/wishlist-actions");
    await recordWishlistContribution(
      String(meta.wishlist_item_id),
      meta.user_id ? String(meta.user_id) : null,
      {
        amount: giftNaira,
        name: String(meta.customer_name || ""),
        email: String(meta.email || ""),
        message: String(meta.message || ""),
        isAnonymous: Boolean(meta.is_anonymous),
      },
      reference,
      "paystack",
    );

    return { ok: true, reason: "wishlist_contribution_created" };
  }

  if (!meta.cause_id) {
    return { ok: false, reason: "missing_cause_id" };
  }

  const donationNaira = Number(meta.amount);
  const tipNaira = Number(meta.tip_amount || 0);
  const check = expectedKoboFor(full, donationNaira, tipNaira);

  if (!check.ok) {
    console.error(
      `[Paystack] Amount mismatch for ${reference}: charged ${check.chargedKobo} kobo, metadata implies a different total - not recording donation`,
    );
    return { ok: false, reason: "amount_mismatch" };
  }

  await createDonation(
    String(meta.cause_id),
    meta.user_id ? String(meta.user_id) : null,
    {
      amount: Number(meta.amount),
      name: String(meta.customer_name || ""),
      email: String(meta.email || ""),
      message: String(meta.message || ""),
      isAnonymous: Boolean(meta.is_anonymous),
      tip_amount: Number(meta.tip_amount || 0),
    },
    undefined,
    reference,
    "paystack",
    meta.ref_v1 ? String(meta.ref_v1) : undefined,
  );

  return { ok: true, reason: "donation_created" };
}
