import { prisma } from "@/lib/prisma";

export interface RegisterTokenParams {
  userId: string;
  token: string;
  platform?: "android" | "ios" | "web";
}

export interface DeviceTokenRow {
  token: string;
  userId: string;
  platform: string;
}

export async function registerDeviceToken(
  params: RegisterTokenParams,
): Promise<boolean> {
  const { userId, token, platform = "android" } = params;

  if (!userId || !token) return false;

  try {
    await prisma.device_tokens.upsert({
      where: { token },
      update: {
        user_id: userId,
        platform,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        token,
        platform,
      },
    });
    return true;
  } catch (error) {
    console.error("Error registering device token:", error);
    return false;
  }
}

export async function unregisterDeviceToken(
  token: string,
  userId?: string,
): Promise<boolean> {
  if (!token) return false;

  try {
    await prisma.device_tokens.deleteMany({
      where: userId ? { token, user_id: userId } : { token },
    });
    return true;
  } catch (error) {
    console.error("Error unregistering device token:", error);
    return false;
  }
}

export async function getUserDeviceTokens(userId: string): Promise<string[]> {
  if (!userId) return [];

  try {
    const rows = await prisma.device_tokens.findMany({
      where: { user_id: userId },
      select: { token: true },
    });
    return rows.map((row) => row.token);
  } catch (error) {
    console.error("Error fetching device tokens for user:", error);
    return [];
  }
}

export async function deleteInvalidTokens(tokens: string[]): Promise<void> {
  if (!tokens || tokens.length === 0) return;

  try {
    await prisma.device_tokens.deleteMany({
      where: { token: { in: tokens } },
    });
  } catch (error) {
    console.error("Error deleting invalid device tokens:", error);
  }
}

export async function countActiveDeviceTokens(): Promise<number> {
  try {
    return await prisma.device_tokens.count();
  } catch (error) {
    console.error("Error counting device tokens:", error);
    return 0;
  }
}

export async function getDeviceTokensForBroadcast(
  audience: "all" | "creators" | "donors" = "all",
): Promise<DeviceTokenRow[]> {
  try {
    if (audience === "creators") {
      return await prisma.$queryRaw<DeviceTokenRow[]>`
        SELECT DISTINCT dt."token", dt."user_id" AS "userId", dt."platform"
        FROM "device_tokens" dt
        INNER JOIN "causes" c ON c."user_id" = dt."user_id"
      `;
    }

    if (audience === "donors") {
      return await prisma.$queryRaw<DeviceTokenRow[]>`
        SELECT DISTINCT dt."token", dt."user_id" AS "userId", dt."platform"
        FROM "device_tokens" dt
        INNER JOIN "donations" d ON d."user_id" = dt."user_id"
      `;
    }

    const rows = await prisma.device_tokens.findMany({
      select: { token: true, user_id: true, platform: true },
    });
    return rows.map((row) => ({
      token: row.token,
      userId: row.user_id,
      platform: row.platform,
    }));
  } catch (error) {
    console.error("Error fetching device tokens for broadcast:", error);
    return [];
  }
}

export async function getDeviceTokenStats(): Promise<{
  total: number;
  android: number;
  ios: number;
  web: number;
}> {
  try {
    const rows = await prisma.device_tokens.groupBy({
      by: ["platform"],
      _count: { _all: true },
    });

    let total = 0;
    let android = 0;
    let ios = 0;
    let web = 0;

    for (const row of rows) {
      const count = row._count._all;
      total += count;
      if (row.platform === "android") android += count;
      else if (row.platform === "ios") ios += count;
      else if (row.platform === "web") web += count;
    }

    return { total, android, ios, web };
  } catch (error) {
    console.error("Error fetching device token stats:", error);
    return { total: 0, android: 0, ios: 0, web: 0 };
  }
}
