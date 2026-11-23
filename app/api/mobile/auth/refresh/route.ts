import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { signMobileToken } from "@/lib/auth/jwt";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_auth_refresh",
      limit: 20,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const { user, errorResponse } = await authenticateMobileRequest(request);
    if (errorResponse) return errorResponse;

    const newToken = await signMobileToken(user!.id, user!.email);

    return apiSuccess({
      token: newToken,
    });
  } catch (error: any) {
    console.error("Mobile API Refresh Token Error:", error);
    return apiError("Invalid or expired token", 401);
  }
}
