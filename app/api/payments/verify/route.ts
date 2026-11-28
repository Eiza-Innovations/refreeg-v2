import { NextRequest, NextResponse } from "next/server";
import type { PaymentProviderType } from "@/types";
import Paystack from "@/services/paystack";
import { processSuccessfulCharge } from "@/lib/payments/paystack-charge-processing";
import {
  processFlutterwaveCharge,
  verifyFlutterwaveTransaction,
} from "@/lib/payments/flutterwave-charge-processing";
import { recordPaymentOutcome } from "@/lib/campaign-analytics/funnel-server";

export async function POST(request: NextRequest) {
  try {
    let body: {
      reference?: unknown;
      provider?: PaymentProviderType;
      transaction_id?: unknown;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload", success: false },
        { status: 400 },
      );
    }

    const reference =
      typeof body?.reference === "string" ? body.reference.trim() : "";
    const provider = body?.provider;
    const rawTransactionId = body?.transaction_id;

    if (!reference) {
      return NextResponse.json(
        { error: "Transaction reference is required" },
        { status: 400 },
      );
    }

    const transactionId =
      typeof rawTransactionId === "string" ||
      typeof rawTransactionId === "number"
        ? String(rawTransactionId).trim()
        : undefined;

    if (transactionId && !/^\d+$/.test(transactionId)) {
      return NextResponse.json(
        { error: "Invalid transaction_id", success: false },
        { status: 400 },
      );
    }

    if (provider === "flutterwave") {
      const full = await verifyFlutterwaveTransaction(reference, transactionId);

      if (!full || full.status !== "successful") {
        return NextResponse.json({ success: true, verified: false });
      }

      try {
        const result = await processFlutterwaveCharge({
          txRef: reference,
          transactionId,
          verifiedTransaction: full,
        });

        if (!result.ok) {
          return NextResponse.json({ success: true, verified: false });
        }
      } catch (donationErr) {
        console.warn(
          "Flutterwave verify fallback donation creation skipped:",
          donationErr instanceof Error
            ? donationErr.message
            : String(donationErr),
        );
      }

      return NextResponse.json({ success: true, verified: true });
    }

    const transaction = await Paystack.verifyTransactionFull(reference);
    const isSuccessful = transaction?.status === "success";
    await recordPaymentOutcome(reference, transaction ?? {}).catch((error) =>
      console.error("Funnel outcome not recorded:", error),
    );

    if (isSuccessful) {
      try {
        await processSuccessfulCharge(reference);
      } catch (processingError) {
        console.error(
          "Failed to record donation during payment verification:",
          processingError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      verified: isSuccessful,
    });
  } catch (error: unknown) {
    console.error("Payment verification error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as { message?: unknown }).message === "string"
          ? String((error as { message: string }).message)
          : "Failed to verify payment";

    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
      },
      { status: 500 },
    );
  }
}
