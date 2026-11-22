jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
      headers: init?.headers || {},
    })),
  },
}));

import type { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/notifications/broadcast/route";
import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "@/actions/admin/role-actions";
import * as deviceTokenService from "@/lib/notifications/device-token-service";
import * as fcmService from "@/lib/notifications/fcm-service";
import * as notificationService from "@/lib/notifications/notification-service";

function makeRequest(payload: unknown): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(payload),
  } as unknown as NextRequest;
}

jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/actions/admin/role-actions", () => ({
  isAdminOrManager: jest.fn(),
}));

jest.mock("@/lib/notifications/device-token-service", () => ({
  getDeviceTokenStats: jest.fn(),
  getDeviceTokensForBroadcast: jest.fn(),
}));

jest.mock("@/lib/notifications/fcm-service", () => ({
  sendPushMulticast: jest.fn(),
  sendPushToUser: jest.fn(),
}));

jest.mock("@/lib/notifications/notification-service", () => ({
  createNotification: jest.fn(),
  createNotificationsBatch: jest.fn().mockResolvedValue(2),
}));

describe("Admin Broadcast API: /api/admin/notifications/broadcast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/notifications/broadcast", () => {
    it("should return 401 if not logged in", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("should return 403 if not admin or manager", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-reg" } });
      (isAdminOrManager as jest.Mock).mockResolvedValue(false);

      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("should return device stats when authorized", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "admin-1" } });
      (isAdminOrManager as jest.Mock).mockResolvedValue(true);
      (deviceTokenService.getDeviceTokenStats as jest.Mock).mockResolvedValue({
        total: 15,
        android: 12,
        ios: 3,
        web: 0,
      });

      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.stats.total).toBe(15);
      expect(json.data.stats.android).toBe(12);
    });
  });

  describe("POST /api/admin/notifications/broadcast", () => {
    it("should return 401 if not logged in", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const res = await POST(makeRequest({ title: "Hello", message: "World" }));
      expect(res.status).toBe(401);
    });

    it("should return 403 if not admin or manager", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-reg" } });
      (isAdminOrManager as jest.Mock).mockResolvedValue(false);

      const res = await POST(makeRequest({ title: "Hello", message: "World" }));
      expect(res.status).toBe(403);
    });

    it("should reject non-object JSON payloads", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "admin-1" } });
      (isAdminOrManager as jest.Mock).mockResolvedValue(true);

      const res = await POST(makeRequest(null));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid JSON");
    });

    it("should reject empty title or message", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "admin-1" } });
      (isAdminOrManager as jest.Mock).mockResolvedValue(true);

      const res = await POST(makeRequest({ title: "", message: "" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Notification title is required");
    });

    it("should reject non-http image URLs", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "admin-1" } });
      (isAdminOrManager as jest.Mock).mockResolvedValue(true);

      const res = await POST(
        makeRequest({
          title: "Urgent Relief",
          message: "Support families today.",
          imageUrl: "javascript:alert(1)",
        }),
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("http(s)");
    });

    it("should return empty result when no registered devices match audience", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "admin-1" } });
      (isAdminOrManager as jest.Mock).mockResolvedValue(true);
      (
        deviceTokenService.getDeviceTokensForBroadcast as jest.Mock
      ).mockResolvedValue([]);

      const res = await POST(
        makeRequest({
          title: "Urgent Relief",
          message: "Support families today.",
          audience: "creators",
        }),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.targetedDevices).toBe(0);
      expect(json.data.sentCount).toBe(0);
      expect(fcmService.sendPushMulticast).not.toHaveBeenCalled();
      expect(
        notificationService.createNotificationsBatch,
      ).not.toHaveBeenCalled();
    });

    it("should broadcast once and write deduplicated in-app notifications without double push", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "admin-1" } });
      (isAdminOrManager as jest.Mock).mockResolvedValue(true);

      (
        deviceTokenService.getDeviceTokensForBroadcast as jest.Mock
      ).mockResolvedValue([
        { token: "fcm-tok-1", userId: "user-1", platform: "android" },
        { token: "fcm-tok-2", userId: "user-1", platform: "ios" },
        { token: "fcm-tok-3", userId: "user-2", platform: "ios" },
      ]);

      (fcmService.sendPushMulticast as jest.Mock).mockResolvedValue({
        success: true,
        sentCount: 3,
        failureCount: 0,
      });

      const res = await POST(
        makeRequest({
          title: "Urgent Flood Relief",
          message: "Please support affected families in Maiduguri.",
          audience: "all",
        }),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.targetedDevices).toBe(3);
      expect(json.data.sentCount).toBe(3);
      expect(fcmService.sendPushMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ["fcm-tok-1", "fcm-tok-2", "fcm-tok-3"],
          title: "Urgent Flood Relief",
          body: "Please support affected families in Maiduguri.",
        }),
      );
      expect(
        notificationService.createNotificationsBatch,
      ).toHaveBeenCalledTimes(1);
      expect(notificationService.createNotificationsBatch).toHaveBeenCalledWith(
        ["user-1", "user-2"],
        expect.objectContaining({
          title: "Urgent Flood Relief",
          message: "Please support affected families in Maiduguri.",
          type: "general",
        }),
      );
      expect(notificationService.createNotification).not.toHaveBeenCalled();
      expect(fcmService.sendPushToUser).not.toHaveBeenCalled();
    });
  });
});
