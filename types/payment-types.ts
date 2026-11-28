export type FlutterwaveTransactionMeta = Record<
  string,
  string | number | boolean | undefined
>;

export interface FlutterwaveVerifiedTransaction {
  id?: string | number;
  tx_ref?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
  customer?: {
    email?: string;
    name?: string;
  };
  meta?: FlutterwaveTransactionMeta;
}

export interface FlutterwaveChargeInput {
  txRef: string;
  transactionId?: string | number | null;
  verifiedTransaction?: FlutterwaveVerifiedTransaction | null;
}

export type FlutterwaveChargeResult =
  { ok: true; reason: string } | { ok: false; reason: string };

export interface FlutterwaveWebhookPayload {
  event?: string;
  data?: {
    id?: string | number;
    tx_ref?: string;
  };
}
