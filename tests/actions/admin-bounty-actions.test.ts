/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/actions/admin/role-actions", () => ({
  isAdminOrManager: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    bounties: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/notifications/notification-service", () => ({
  createNotification: jest.fn(),
}));

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "@/actions/admin/role-actions";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications/notification-service";
import {
  decideBounty,
  listAdminBounties,
} from "@/actions/admin/admin-bounty-actions";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as unknown as {
  bounties: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const row = {
  id: "bounty-1",
  title: "Record a video",
  category: "content",
  description: "Explain the campaign",
  deliverable: "One video",
  reward: "25000",
  available_spots: 3,
  deadline: new Date("2026-12-18"),
  submitted_at: new Date("2026-11-21"),
  created_at: new Date("2026-11-20"),
  status: "in-review",
  changes_requested: null,
  cause: { title: "Clean water for Odo-Ado" },
  owner: { fullName: "Adedayo Johnson" },
};

describe("admin-bounty-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    (isAdminOrManager as jest.Mock).mockResolvedValue(true);
    (createNotification as jest.Mock).mockResolvedValue(null);
  });

  describe("listAdminBounties", () => {
    it("throws when the caller is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(listAdminBounties()).rejects.toThrow("Unauthorized");
    });

    it("throws when the caller lacks admin or manager role", async () => {
      (isAdminOrManager as jest.Mock).mockResolvedValue(false);

      await expect(listAdminBounties()).rejects.toThrow(
        "Unauthorized: Admin or Manager role required",
      );
    });

    it("maps bounty rows to the Bounty shape for an admin", async () => {
      mockPrisma.bounties.findMany.mockResolvedValue([row]);

      const result = await listAdminBounties();

      expect(result).toEqual([
        {
          id: "bounty-1",
          title: "Record a video",
          campaign: "Clean water for Odo-Ado",
          category: "content",
          description: "Explain the campaign",
          deliverable: "One video",
          reward: 25000,
          availableSpots: 3,
          deadline: "2026-12-18",
          submittedAt: row.submitted_at.toISOString(),
          owner: "Adedayo Johnson",
          status: "in-review",
          submissions: 0,
          changesRequested: undefined,
        },
      ]);
    });
  });

  describe("decideBounty", () => {
    it("throws when the caller lacks admin or manager role", async () => {
      (isAdminOrManager as jest.Mock).mockResolvedValue(false);

      await expect(
        decideBounty({ bountyId: "bounty-1", decision: "approve" }),
      ).rejects.toThrow("Unauthorized: Admin or Manager role required");
      expect(mockPrisma.bounties.update).not.toHaveBeenCalled();
    });

    it("approves a bounty, notifies the owner, and revalidates", async () => {
      mockPrisma.bounties.update.mockResolvedValue({
        title: "Record a video",
        owner_id: "user-1",
      });

      const result = await decideBounty({
        bountyId: "bounty-1",
        decision: "approve",
      });

      expect(result).toEqual({ success: true });
      expect(mockPrisma.bounties.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "bounty-1" },
          data: expect.objectContaining({
            status: "live",
            changes_requested: null,
          }),
        }),
      );
      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", type: "bounty_reviewed" }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/bounties");
    });

    it("requests changes with feedback stored on the bounty", async () => {
      mockPrisma.bounties.update.mockResolvedValue({
        title: "Record a video",
        owner_id: "user-1",
      });

      await decideBounty({
        bountyId: "bounty-1",
        decision: "request_changes",
        feedback: "Add captions in Hausa too.",
      });

      expect(mockPrisma.bounties.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "changes-requested",
            changes_requested: "Add captions in Hausa too.",
          }),
        }),
      );
    });

    it("rejects a change request with feedback that is too short", async () => {
      await expect(
        decideBounty({
          bountyId: "bounty-1",
          decision: "request_changes",
          feedback: "too short",
        }),
      ).rejects.toThrow();
      expect(mockPrisma.bounties.update).not.toHaveBeenCalled();
    });
  });
});
