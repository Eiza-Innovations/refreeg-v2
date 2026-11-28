import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "donation_received"
  | "cause_created"
  | "cause_approved"
  | "cause_rejected"
  | "milestone_proof"
  | "petition_signed"
  | "comment_received"
  | "bounty_reviewed"
  | "general";

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  data: unknown;
  isRead: boolean;
  createdAt: Date;
}

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  skipPush?: boolean;
}

function mapNotification(row: {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  data: Prisma.JsonValue | null;
  is_read: boolean;
  created_at: Date;
}): NotificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    data: row.data,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function createNotification(
  params: CreateNotificationParams,
): Promise<NotificationRecord | null> {
  const { userId, title, message, type, data, skipPush = false } = params;

  try {
    const row = await prisma.notifications.create({
      data: {
        user_id: userId,
        title,
        message,
        type,
        ...(data !== undefined ? { data: data as Prisma.InputJsonValue } : {}),
        is_read: false,
      },
    });

    const notification = mapNotification(row);

    try {
      const { eventBus } = await import("@/lib/event-bus");
      eventBus.emit("notification", {
        type: "notification",
        data: {
          ...notification,
          user_id: userId,
        },
      });
    } catch (busErr) {
      console.warn("Failed to emit notification to eventBus:", busErr);
    }

    if (!skipPush && type !== "petition_signed") {
      try {
        const { sendPushToUser } =
          await import("@/lib/notifications/fcm-service");
        sendPushToUser({
          userId,
          title,
          body: message,
          data: {
            id: notification.id,
            type: String(type),
            ...(data || {}),
          },
        }).catch((pushErr) => {
          console.error("Failed to send push notification:", pushErr);
        });
      } catch (pushImportErr) {
        console.warn("FCM push notification dispatch skipped:", pushImportErr);
      }
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

export async function createNotificationsBatch(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId" | "skipPush">,
): Promise<number> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return 0;

  try {
    const jsonData =
      params.data !== undefined
        ? (params.data as Prisma.InputJsonValue)
        : undefined;

    const result = await prisma.notifications.createMany({
      data: uniqueIds.map((userId) => ({
        user_id: userId,
        title: params.title,
        message: params.message,
        type: params.type,
        ...(jsonData !== undefined ? { data: jsonData } : {}),
        is_read: false,
      })),
    });

    return result.count;
  } catch (error) {
    console.error("Error creating notification batch:", error);
    return 0;
  }
}

export async function getNotifications(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<{
  items: NotificationRecord[];
  total: number;
  unreadCount: number;
  limit: number;
  offset: number;
}> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 20, 1), 100);
  const safeOffset = Math.max(Math.trunc(offset) || 0, 0);

  try {
    const [rows, total, unreadCount] = await Promise.all([
      prisma.notifications.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: safeLimit,
        skip: safeOffset,
      }),
      prisma.notifications.count({ where: { user_id: userId } }),
      prisma.notifications.count({
        where: { user_id: userId, is_read: false },
      }),
    ]);

    return {
      items: rows.map(mapNotification),
      total,
      unreadCount,
      limit: safeLimit,
      offset: safeOffset,
    };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return {
      items: [],
      total: 0,
      unreadCount: 0,
      limit: safeLimit,
      offset: safeOffset,
    };
  }
}

export async function markNotificationsAsRead(
  userId: string,
  notificationId?: string,
  markAll = false,
): Promise<boolean> {
  try {
    if (markAll) {
      await prisma.notifications.updateMany({
        where: { user_id: userId, is_read: false },
        data: { is_read: true, updated_at: new Date() },
      });
    } else if (notificationId) {
      await prisma.notifications.updateMany({
        where: { id: notificationId, user_id: userId },
        data: { is_read: true, updated_at: new Date() },
      });
    }
    return true;
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return false;
  }
}
