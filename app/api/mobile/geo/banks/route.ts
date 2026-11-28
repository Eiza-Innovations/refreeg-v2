import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { withMobileCache } from "@/lib/api/mobile-cache";
import Paystack from "@/services/paystack";

const BANKS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET() {
  try {
    const banks = await withMobileCache(
      "geo:banks:ng",
      BANKS_CACHE_TTL_MS,
      async () => {
        const list = await Paystack.listBanks();
        if (!Array.isArray(list) || list.length === 0) {
          throw new Error("Bank list unavailable");
        }
        return list;
      },
    );
    return apiSuccess(banks);
  } catch (error: any) {
    console.error("Mobile API Get Banks Error:", error);
    return apiError("Failed to fetch banks", 500);
  }
}
