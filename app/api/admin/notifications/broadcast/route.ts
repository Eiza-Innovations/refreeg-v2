import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "@/actions/admin/role-actions";
import {
  getDeviceTokensForBroadcast,
  getDeviceTokenStats,
} from "@/lib/notifications/device-token-service";
import { sendPushMulticast } from "@/lib/notifications/fcm-service";
import { createNotificationsBatch } from "@/lib/notifications/notification-service";

const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 500;

function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

async function authorizeAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: jsonError("Unauthorized", 401) };
  }

  const isAuthorized = await isAdminOrManager(session.user.id);
  if (!isAuthorized) {
    return { error: jsonError("Forbidden: Admin or Manager role required", 403) };
  }

  return { error: null };
}

/**
 * GET /api/admin/notifications/broadcast
 * Returns registered device stats for the admin push notification console.
 */
export async function GET() {
  const { error } = await authorizeAdmin();
  if (error) return error;

  const stats = await getDeviceTokenStats();
  return jsonSuccess({ stats });
}

/**
 * POST /api/admin/notifications/broadcast
 * Sends marketing or operational push notification broadcast to mobile users.
 */
export async function POST(request: NextRequest) {
  const { error: authError } = await authorizeAdmin();
  if (authError) return authError;

  try {
    const rawBody: unknown = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return jsonError("Invalid JSON request body", 400);
    }
    const body = rawBody as Record<string, unknown>;
    const rawTitle = typeof body.title === "string" ? body.title.trim() : "";
    const rawMessage =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!rawTitle) {
      return jsonError("Notification title is required", 400);
    }
    if (rawTitle.length > MAX_TITLE_LENGTH) {
      return jsonError(
        `Notification title must be ${MAX_TITLE_LENGTH} characters or less`,
        400,
      );
    }

    if (!rawMessage) {
      return jsonError("Notification message is required", 400);
    }
    if (rawMessage.length > MAX_MESSAGE_LENGTH) {
      return jsonError(
        `Notification message must be ${MAX_MESSAGE_LENGTH} characters or less`,
        400,
      );
    }

    let safeImageUrl: string | undefined;
    if (body.imageUrl !== undefined && body.imageUrl !== null) {
      if (typeof body.imageUrl !== "string") {
        return jsonError("Banner image URL must be a valid http(s) URL", 400);
      }
      const trimmedImageUrl = body.imageUrl.trim();
      if (trimmedImageUrl) {
        if (
          !trimmedImageUrl.startsWith("https://") &&
          !trimmedImageUrl.startsWith("http://")
        ) {
          return jsonError("Banner image URL must be a valid http(s) URL", 400);
        }
        safeImageUrl = trimmedImageUrl;
      }
    }

    const safeAudience =
      body.audience === "creators" || body.audience === "donors"
        ? body.audience
        : "all";
    const safeUrl = typeof body.url === "string" ? body.url.trim() : "";

    const rows = await getDeviceTokensForBroadcast(safeAudience);
    if (!rows || rows.length === 0) {
      return jsonSuccess({
        message: "No registered devices found for the selected audience.",
        targetedDevices: 0,
        sentCount: 0,
        failureCount: 0,
      });
    }

    const tokens = Array.from(new Set(rows.map((r) => r.token)));
    const uniqueUserIds = Array.from(new Set(rows.map((r) => r.userId)));

    const pushResult = await sendPushMulticast({
      tokens,
      title: rawTitle,
      body: rawMessage,
      imageUrl: safeImageUrl,
      data: {
        type: "general",
        url: safeUrl,
        sender: "admin_broadcast",
      },
    });

    try {
      await createNotificationsBatch(uniqueUserIds, {
        title: rawTitle,
        message: rawMessage,
        type: "general",
        data: {
          url: safeUrl,
          sender: "admin_broadcast",
        },
      });
    } catch (notifErr) {
      console.error("[Broadcast] In-app notification batch error:", notifErr);
    }

    return jsonSuccess({
      message: `Broadcast sent to ${tokens.length} device(s)`,
      targetedDevices: tokens.length,
      sentCount: pushResult.sentCount,
      failureCount: pushResult.failureCount,
      skipped: pushResult.skipped ?? false,
    });
  } catch (error: unknown) {
    console.error("Admin Push Broadcast Error:", error);
    return jsonError(
      error instanceof Error ? error.message : "Internal server error",
      500,
    );
  }
}
