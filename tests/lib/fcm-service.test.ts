const mockSendEachForMulticast = jest.fn();

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(() => ({ name: "[DEFAULT]" })),
  getApps: jest.fn(() => [{ name: "[DEFAULT]" }]),
  cert: jest.fn((creds) => creds),
}));

jest.mock("firebase-admin/messaging", () => ({
  getMessaging: jest.fn(() => ({
    sendEachForMulticast: mockSendEachForMulticast,
  })),
}));

jest.mock("@/lib/notifications/device-token-service", () => ({
  getUserDeviceTokens: jest.fn(),
  deleteInvalidTokens: jest.fn(),
}));

import { sendPushMulticast } from "@/lib/notifications/fcm-service";

describe("sendPushMulticast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });
  });

  it("includes APNs mutableContent and fcmOptions.imageUrl when imageUrl is provided", async () => {
    const imageUrl = "https://cdn.refreeg.com/campaigns/promo.png";

    const result = await sendPushMulticast({
      tokens: ["token-1"],
      title: "Campaign update",
      body: "Proof of delivery posted",
      imageUrl,
    });

    expect(result).toEqual({ success: true, sentCount: 1, failureCount: 0 });
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1);

    const payload = mockSendEachForMulticast.mock.calls[0][0];
    expect(payload.notification).toEqual({
      title: "Campaign update",
      body: "Proof of delivery posted",
      imageUrl,
    });
    expect(payload.android.notification.imageUrl).toBe(imageUrl);
    expect(payload.apns).toEqual({
      payload: {
        aps: {
          sound: "default",
          badge: 1,
          mutableContent: true,
        },
      },
      fcmOptions: { imageUrl },
    });
  });

  it("omits APNs mutableContent and fcmOptions when imageUrl is not provided", async () => {
    const result = await sendPushMulticast({
      tokens: ["token-1"],
      title: "Receipt",
      body: "Thank you for donating",
    });

    expect(result).toEqual({ success: true, sentCount: 1, failureCount: 0 });
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1);

    const payload = mockSendEachForMulticast.mock.calls[0][0];
    expect(payload.notification).toEqual({
      title: "Receipt",
      body: "Thank you for donating",
    });
    expect(payload.android.notification.imageUrl).toBeUndefined();
    expect(payload.apns).toEqual({
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    });
    expect(payload.apns.payload.aps.mutableContent).toBeUndefined();
    expect(payload.apns.fcmOptions).toBeUndefined();
  });
});
