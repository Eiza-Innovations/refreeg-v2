import { NextRequest, NextResponse } from "next/server";
import {
  processFlutterwaveCharge,
  verifyFlutterwaveWebhookHash,
} from "@/lib/payments/flutterwave-charge-processing";
import type { FlutterwaveWebhookPayload } from "@/types/payment-types";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    if (!payload) {
      return NextResponse.json(
        { error: "Empty payload received" },
        { status: 400 },
      );
    }

    const webhookHash = request.headers.get("verif-hash");
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;

    if (!secretHash) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    if (!verifyFlutterwaveWebhookHash(webhookHash, secretHash)) {
      return NextResponse.json(
        { error: "Invalid webhook hash" },
        { status: 400 },
      );
    }

    let webhookData: FlutterwaveWebhookPayload;
    try {
      webhookData = JSON.parse(payload) as FlutterwaveWebhookPayload;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    if (!webhookData?.event) {
      return NextResponse.json(
        { error: "Invalid webhook data structure" },
        { status: 400 },
      );
    }

    const { event, data } = webhookData;

    switch (event) {
      case "charge.completed": {
        const rawTxRef = data?.tx_ref;
        const txRef = typeof rawTxRef === "string" ? rawTxRef.trim() : "";
        const transactionId = data?.id;

        if (!txRef) {
          return NextResponse.json(
            { error: "Missing tx_ref" },
            { status: 400 },
          );
        }

        // Acknowledge immediately with 200 OK so Flutterwave never marks the
        // endpoint down while verification, DB writes, or emails run.
        Promise.resolve().then(async () => {
          try {
            await processFlutterwaveCharge({
              txRef,
              transactionId,
            });
          } catch (bgError) {
            console.error("[Flutterwave Webhook Background] Failed:", bgError);
          }
        });

        return NextResponse.json(
          { message: "Webhook received, processing in background" },
          { status: 200 },
        );
      }

      default:
        return NextResponse.json(
          { message: "Webhook event not supported yet" },
          { status: 200 },
        );
    }
  } catch (e) {
    console.error("Flutterwave webhook processing error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
