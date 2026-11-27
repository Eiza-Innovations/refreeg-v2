import { ICreateSubaccount, TransactionData } from "@/types";
import axios, { type AxiosInstance } from "axios";
import { getBaseURL } from "@/lib/utils";
import {
  checkCircuit,
  recordFailure,
  recordSuccess,
} from "@/lib/api/circuit-breaker";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  console.warn(
    "WARNING: No Paystack Secret Key found in environment variables. API calls will fail.",
  );
}

export interface PaystackChargeResponse {
  status: string;
  reference: string;
  display_text?: string;
  account_number?: string;
  account_name?: string;
  bank?: any;
  ussd_code?: string;
  expires_at?: string;
  url?: string;
  [key: string]: unknown;
}

async function postWithCircuit<T = Record<string, unknown>>(
  api: AxiosInstance,
  path: string,
  body: Record<string, unknown>,
  fallbackError: string,
): Promise<T> {
  checkCircuit("paystack");
  try {
    const response = await api.post(path, body);
    recordSuccess("paystack");
    return response.data.data as T;
  } catch (error: any) {
    recordFailure("paystack");
    throw new Error(error.response?.data?.message || fallbackError);
  }
}

const Paystack = {
  api: axios.create({
    baseURL: "https://api.paystack.co",
    timeout: 5000,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  }),

  initializeTransaction: async function (data: TransactionData) {
    checkCircuit("paystack"); // 👈 Throws if circuit is open
    try {
      if (!data.amount) {
        throw new Error(
          "Missing required fields for transaction initialization",
        );
      }
      const baseUrl = await getBaseURL();
      const totalCharge =
        data.amount +
        data.serviceFee +
        (data.providerFee || 0) +
        (data.tipAmount || 0);
      const feePlusTip = data.serviceFee + (data.tipAmount || 0);
      const primarySubaccount = data.subaccounts?.find(
        (entry) => entry?.subaccount?.trim().length,
      )?.subaccount;

      const requestData = {
        currency: "NGN",
        email: data.email,
        amount: Math.round(totalCharge * 100),
        callback_url:
          data.callbackUrl ||
          // Non-cause charges (wishlist items) must pass an explicit
          // callbackUrl; no cause-verify URL exists for them.
          (data.causeId
            ? `${baseUrl}/causes/${data.causeId}/payment/verify`
            : undefined),
        transaction_charge: Math.round(feePlusTip * 100),
        ...(primarySubaccount
          ? {
              subaccount: primarySubaccount,
              bearer: "account",
            }
          : {}),
        ...(data.plan ? { plan: data.plan } : {}),
        ...(data.channels?.length ? { channels: data.channels } : {}),
        metadata: {
          amount: data.amount,
          tip_amount: data.tipAmount || 0,
          customer_name: data.full_name,
          ...(data.wishlistItemId
            ? { wishlist_item_id: data.wishlistItemId }
            : { cause_id: data.causeId }),
          email: data.email,
          message: data.message ?? "",
          is_anonymous: Boolean(data.isAnonymous),
          ...(data.referrer_code ? { ref_v1: data.referrer_code } : {}),
          ...(data.id ? { user_id: data.id } : {}),
          ...(data.plan ? { plan: data.plan } : {}),
          ...(data.pledgeFlow
            ? {
                pledge_flow: data.pledgeFlow,
                pledge_id: data.pledgeId,
                future_pledge_amount: data.pledgeFutureAmount,
                reminder_date: data.reminderDate,
              }
            : {}),
        },
      };

      const response = await this.api.post(
        "/transaction/initialize",
        requestData,
      );

      recordSuccess("paystack"); // 👈 Reset circuit on success
      return response.data.data as {
        authorization_url: string;
        reference: string;
        access_code: string;
      };
    } catch (error: any) {
      recordFailure("paystack"); // 👈 Record failure
      console.error("Paystack initialization error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        data: error.response?.data?.message,
      });

      throw new Error(
        error.response?.data?.message ||
          "Failed to initialize payment transaction",
      );
    }
  },

  verifyTransaction: async function (transactionReference: string) {
    checkCircuit("paystack");
    try {
      const response = await this.api.get(
        `/transaction/verify/${transactionReference}`,
      );
      recordSuccess("paystack");
      return response.data.data.status === "success";
    } catch (error) {
      recordFailure("paystack");
      throw error;
    }
  },

  verifyTransactionFull: async function (transactionReference: string) {
    checkCircuit("paystack");
    try {
      const response = await this.api.get(
        `/transaction/verify/${transactionReference}`,
      );
      recordSuccess("paystack");
      return response.data.data;
    } catch (error) {
      recordFailure("paystack");
      throw error;
    }
  },

  chargeAuthorization: async function (params: {
    authorizationCode: string;
    email: string;
    amountNgn: number;
    serviceFeeNgn: number;
    reference: string;
    causeId: string;
    subaccount?: string;
    bearer?: "account" | "subaccount";
    metadata: Record<string, string | number | boolean | undefined>;
  }) {
    checkCircuit("paystack");
    try {
      const totalKobo = Math.round(
        (params.amountNgn + params.serviceFeeNgn) * 100,
      );
      const feeKobo = Math.round(params.serviceFeeNgn * 100);
      const primarySubaccount = params.subaccount?.trim();

      const body: Record<string, unknown> = {
        authorization_code: params.authorizationCode,
        email: params.email,
        amount: totalKobo,
        reference: params.reference,
        currency: "NGN",
        metadata: params.metadata,
      };

      if (primarySubaccount) {
        body.subaccount = primarySubaccount;
        body.bearer = params.bearer ?? "subaccount";
        body.transaction_charge = feeKobo;
      }

      const response = await this.api.post(
        "/transaction/charge_authorization",
        body,
      );

      recordSuccess("paystack");
      return response.data.data as {
        status?: string;
        reference?: string;
        gateway_response?: string;
      };
    } catch (error) {
      recordFailure("paystack");
      throw error;
    }
  },

  createSubaccount: async function (data: ICreateSubaccount) {
    checkCircuit("paystack");
    try {
      const response = await this.api.post("/subaccount", {
        ...data,
        settlement_bank: data.bank_code,
      });
      recordSuccess("paystack");
      return response.data.data as {
        subaccount_code: string;
        account_number: string;
      };
    } catch (error) {
      recordFailure("paystack");
      throw error;
    }
  },

  listBanks: async function () {
    try {
      const response = await this.api.get("/bank", {
        params: { country: "nigeria", perPage: 100 },
      });
      return response.data.data as {
        name: string;
        code: string;
      }[];
    } catch (error) {
      console.error("Error fetching banks:", error);
      return [];
    }
  },

  verifyAccountNumber: async function (
    accountNumber: string,
    bankCode: string,
  ) {
    try {
      const response = await this.api.get("/bank/resolve", {
        params: { account_number: accountNumber, bank_code: bankCode },
      });
      return response.data.data as {
        account_name: string;
        bank_id: number;
      };
    } catch (error: any) {
      console.error(
        "Error verifying account:",
        error.response?.data || error.message || error,
      );
      throw new Error(
        error.response?.data?.message || "Failed to verify account number",
      );
    }
  },

  charge: async function (
    payload: Record<string, any>,
  ): Promise<PaystackChargeResponse> {
    return postWithCircuit<PaystackChargeResponse>(
      this.api,
      "/charge",
      payload,
      "Failed to initiate Paystack charge",
    );
  },

  submitPin: async function (pin: string, reference: string) {
    return postWithCircuit(
      this.api,
      "/charge/submit_pin",
      { pin, reference },
      "Failed to submit card PIN",
    );
  },

  submitOtp: async function (otp: string, reference: string) {
    return postWithCircuit(
      this.api,
      "/charge/submit_otp",
      { otp, reference },
      "Failed to submit OTP",
    );
  },

  submitPhone: async function (phone: string, reference: string) {
    return postWithCircuit(
      this.api,
      "/charge/submit_phone",
      { phone, reference },
      "Failed to submit phone verification",
    );
  },

  refundTransaction: async function (
    transactionReference: string,
    amountKobo?: number,
  ) {
    return postWithCircuit(
      this.api,
      "/refund",
      {
        transaction: transactionReference,
        ...(amountKobo ? { amount: amountKobo } : {}),
      },
      "Failed to refund transaction",
    );
  },
};

export default Paystack;
