import { NextRequest } from "next/server";
import { verifyMobileToken } from "./jwt";
import { prisma } from "@/lib/prisma";
import { apiError } from "../api/response";

export interface MobileAuthResult {
  user?: {
    id: string;
    email: string;
    fullName: string | null;
  };
  errorResponse?: Response;
}

/**
 * Authenticates a mobile API request using the Bearer token.
 * Validates the token and fetches the user from the database, enforcing
 * block status and session invalidation timestamps.
 */
export async function authenticateMobileRequest(
  request: NextRequest,
): Promise<MobileAuthResult> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      errorResponse: apiError("Missing or invalid authorization header", 401),
    };
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return {
      errorResponse: apiError("Token not provided", 401),
    };
  }

  try {
    const payload = await verifyMobileToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        isBlocked: true,
        sessions_invalidated_after: true,
      },
    });

    if (!user || !user.email) {
      return {
        errorResponse: apiError("User not found or invalid", 401),
      };
    }

    if (user.isBlocked) {
      return {
        errorResponse: apiError(
          "Your account has been suspended. Contact support for assistance.",
          403,
        ),
      };
    }

    if (
      user.sessions_invalidated_after &&
      (!payload.iat ||
        payload.iat * 1000 < user.sessions_invalidated_after.getTime())
    ) {
      return {
        errorResponse: apiError(
          "Session has been revoked. Please sign in again.",
          401,
        ),
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  } catch (error) {
    return {
      errorResponse: apiError("Invalid or expired token", 401),
    };
  }
}
