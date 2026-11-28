import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";

const DIDIT_SESSION_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * GET /api/mobile/kyc/session/[sessionId]
 *
 * Retrieves the decision/status for a specific Didit verification session.
 * This is useful for the mobile app to get real-time status immediately after
 * the user completes the Didit flow, before the webhook fires.
 *
 * The mobile app receives the `session_id` from `POST /api/mobile/kyc` and can
 * use this endpoint to check the session result.
 *
 * Response:
 *   {
 *     "success": true,
 *     "data": {
 *       "session_id": "...",
 *       "status": "Approved" | "Declined" | "In Progress" | "Review",
 *       "vendor_data": "user_id",
 *       ...additional Didit decision fields
 *     }
 *   }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  const rateLimited = enforceRateLimit(request, {
    namespace: "mobile_kyc_session_status",
    limit: 20,
    windowMs: 60_000,
    identifier: user!.id,
  });
  if (rateLimited) return rateLimited;

  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return apiError("Session ID is required", 400);
    }

    if (!DIDIT_SESSION_ID_REGEX.test(sessionId)) {
      return apiError("Invalid session ID", 400);
    }

    const ownedVerification = await prisma.kyc_verifications.findFirst({
      where: {
        user_id: user!.id,
        document_url: { startsWith: `${sessionId}:::` },
      },
      select: { id: true },
    });
    if (!ownedVerification) {
      return apiError("Session does not belong to this user", 403);
    }

    const apiKey =
      process.env.DIDIT_API_KEY || process.env.DIDIT_CLIENT_SECRET || "";
    if (!apiKey) {
      return apiError("KYC service is not configured", 503);
    }

    const diditResponse = await fetch(
      `https://verification.didit.me/v3/session/${encodeURIComponent(sessionId)}/decision/`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      },
    );

    if (!diditResponse.ok) {
      if (diditResponse.status === 404) {
        return apiError("Session not found", 404);
      }
      const errorText = await diditResponse.text();
      console.error("Didit session retrieval error:", errorText);
      return apiError("Failed to retrieve session status", 502);
    }

    const sessionData = await diditResponse.json();

    // Fail closed: require vendor_data to match the authenticated user
    if (!sessionData.vendor_data || sessionData.vendor_data !== user!.id) {
      return apiError("Session does not belong to this user", 403);
    }

    return apiSuccess({
      session_id: sessionId,
      status: sessionData.status || "Unknown",
      created_at: sessionData.created_at,
      updated_at: sessionData.updated_at,
      // Include verification details if available
      ...(sessionData.features && { features: sessionData.features }),
    });
  } catch (error: any) {
    console.error("Mobile API Get KYC Session Error:", error);
    return apiError("Internal server error", 500);
  }
}
