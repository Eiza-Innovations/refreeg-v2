import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import {
  getMessaging,
  type MulticastMessage,
  type SendResponse,
} from "firebase-admin/messaging";
import {
  getUserDeviceTokens,
  deleteInvalidTokens,
} from "@/lib/notifications/device-token-service";

// FCM sendEachForMulticast enforces a hard limit of 500 registration tokens per call.
const FCM_MULTICAST_BATCH_SIZE = 500;
const INVALID_TOKEN_ERROR_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

let fcmWarningLogged = false;

/**
 * Initialize Firebase Admin App once.
 * Gracefully handles missing credentials in local development.
 */
export function getFirebaseAdminApp(): App | null {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  try {
    if (serviceAccountJson) {
      const parsed = JSON.parse(serviceAccountJson);
      return initializeApp({
        credential: cert(parsed),
      });
    }

    if (projectId && clientEmail && privateKey) {
      if (privateKey.includes("\\n")) {
        privateKey = privateKey.replace(/\\n/g, "\n");
      }
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    if (!fcmWarningLogged) {
      console.warn(
        "[FCM] Firebase Admin credentials not found in environment (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Push notifications will be skipped.",
      );
      fcmWarningLogged = true;
    }
    return null;
  } catch (error) {
    console.error("[FCM] Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}

export interface SendPushParams {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  imageUrl?: string;
}

export interface PushResult {
  success: boolean;
  sentCount: number;
  failureCount: number;
  skipped?: boolean;
}

export interface SendMulticastParams {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  imageUrl?: string;
}

function serializeDataPayload(
  data?: Record<string, unknown>,
): Record<string, string> {
  const stringData: Record<string, string> = {};
  if (!data) return stringData;

  for (const [key, value] of Object.entries(data)) {
    stringData[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return stringData;
}

/**
 * Send multicast FCM message to a list of device tokens in batches of 500.
 */
export async function sendPushMulticast(
  params: SendMulticastParams,
): Promise<PushResult> {
  const { tokens, title, body, data, imageUrl } = params;

  const app = getFirebaseAdminApp();
  if (!app) {
    return { success: false, sentCount: 0, failureCount: 0, skipped: true };
  }

  if (!tokens || tokens.length === 0) {
    return { success: true, sentCount: 0, failureCount: 0 };
  }

  const stringData = serializeDataPayload(data);
  const messaging = getMessaging(app);
  const invalidTokens: string[] = [];
  let sentCount = 0;
  let failureCount = 0;

  for (let i = 0; i < tokens.length; i += FCM_MULTICAST_BATCH_SIZE) {
    const batch = tokens.slice(i, i + FCM_MULTICAST_BATCH_SIZE);
    const message: MulticastMessage = {
      tokens: batch,
      notification: {
        title,
        body,
        ...(imageUrl ? { imageUrl } : {}),
      },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          channelId: "refreeg_important_channel",
          sound: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
          ...(imageUrl ? { imageUrl } : {}),
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      sentCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((resp: SendResponse, index: number) => {
        if (
          !resp.success &&
          resp.error &&
          INVALID_TOKEN_ERROR_CODES.has(resp.error.code)
        ) {
          invalidTokens.push(batch[index]!);
        }
      });
    } catch (error) {
      console.error("[FCM] Error sending multicast push notification:", error);
      failureCount += batch.length;
    }
  }

  if (invalidTokens.length > 0) {
    Promise.resolve(deleteInvalidTokens(invalidTokens)).catch((err) =>
      console.error("[FCM] Error pruning invalid tokens:", err),
    );
  }

  return {
    success: sentCount > 0,
    sentCount,
    failureCount,
  };
}

/**
 * Send real-time FCM push notification to all registered devices of a user.
 * Automatically cleans up invalid or expired FCM registration tokens.
 */
export async function sendPushToUser(
  params: SendPushParams,
): Promise<PushResult> {
  const { userId, title, body, data, imageUrl } = params;

  const app = getFirebaseAdminApp();
  if (!app) {
    return { success: false, sentCount: 0, failureCount: 0, skipped: true };
  }

  const tokens = await getUserDeviceTokens(userId);
  if (!tokens || tokens.length === 0) {
    return { success: true, sentCount: 0, failureCount: 0 };
  }

  return sendPushMulticast({ tokens, title, body, data, imageUrl });
}
