jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
      headers: init?.headers || {},
    })),
  },
}));

import { POST, DELETE } from "@/app/api/mobile/devices/route";
import { prisma } from "@/lib/prisma";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";

jest.mock("@/lib/auth/mobile-auth", () => ({
  authenticateMobileRequest: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    device_tokens: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe("Mobile Devices API: /api/mobile/devices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/mobile/devices", () => {
    it("should return error if not authenticated", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: null,
        errorResponse: {
          status: 401,
          json: async () => ({ error: "Unauthorized", success: false }),
        },
      });

      const req = {
        json: jest.fn().mockResolvedValue({ token: "test-fcm-token" }),
      } as any;

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should reject missing device token", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: { id: "user-uuid-123" },
        errorResponse: null,
      });

      const req = {
        json: jest.fn().mockResolvedValue({ token: "" }),
      } as any;

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Device token is required");
    });

    it("should register or upsert device token successfully", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: { id: "user-uuid-123" },
        errorResponse: null,
      });

      (prisma.device_tokens.upsert as jest.Mock).mockResolvedValue({
        id: "device-token-1",
      });

      const req = {
        json: jest.fn().mockResolvedValue({
          token: "fcm-token-android-xyz",
          platform: "android",
        }),
      } as any;

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(prisma.device_tokens.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: "fcm-token-android-xyz" },
          create: expect.objectContaining({
            user_id: "user-uuid-123",
            token: "fcm-token-android-xyz",
            platform: "android",
          }),
        }),
      );
    });
  });

  describe("DELETE /api/mobile/devices", () => {
    it("should return error if not authenticated", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: null,
        errorResponse: {
          status: 401,
          json: async () => ({ error: "Unauthorized", success: false }),
        },
      });

      const req = {
        json: jest.fn().mockResolvedValue({ token: "fcm-token-android-xyz" }),
      } as any;

      const res = await DELETE(req);
      expect(res.status).toBe(401);
    });

    it("should reject empty token on delete", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: { id: "user-uuid-123" },
        errorResponse: null,
      });

      const req = {
        json: jest.fn().mockResolvedValue({ token: "" }),
      } as any;

      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it("should delete device token successfully on logout", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: { id: "user-uuid-123" },
        errorResponse: null,
      });

      (prisma.device_tokens.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      const req = {
        json: jest.fn().mockResolvedValue({ token: "fcm-token-android-xyz" }),
      } as any;

      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(prisma.device_tokens.deleteMany).toHaveBeenCalledWith({
        where: {
          token: "fcm-token-android-xyz",
          user_id: "user-uuid-123",
        },
      });
    });
  });
});
