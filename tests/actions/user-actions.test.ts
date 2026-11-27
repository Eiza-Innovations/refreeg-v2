jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/actions/admin/role-actions", () => ({
  getUserRole: jest.fn(),
}));

jest.mock("@/actions/admin/database-actions", () => ({
  logAdminActivity: jest.fn(),
}));

jest.mock("@/lib/auth/account-deletion", () => ({
  executeUserAccountDeletion: jest.fn(),
}));

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { getUserRole } from "@/actions/admin/role-actions";
import { logAdminActivity } from "@/actions/admin/database-actions";
import { executeUserAccountDeletion } from "@/lib/auth/account-deletion";
import {
  blockUser,
  unblockUser,
  isUserBlocked,
  deleteUserAccount,
  deleteUserAsAdmin,
} from "@/actions/users/user-actions";

const mockAuth = auth as jest.Mock;
const mockGetUserRole = getUserRole as jest.Mock;
const mockLogAdminActivity = logAdminActivity as jest.Mock;
const mockExecuteDeletion = executeUserAccountDeletion as jest.Mock;
const mockPrisma = prisma as unknown as {
  user: {
    update: jest.Mock;
    findUnique: jest.Mock;
  };
};

describe("user-actions", () => {
  const originalDemoEnabled = process.env.STORE_REVIEW_DEMO_ENABLED;
  const originalDemoEmail = process.env.STORE_REVIEW_DEMO_EMAIL;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockGetUserRole.mockImplementation(async (id: string) =>
      id === "admin-1" ? "admin" : "user",
    );
    mockPrisma.user.update.mockResolvedValue({});
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockExecuteDeletion.mockResolvedValue({ success: true, statusCode: 200 });
  });

  afterEach(() => {
    process.env.STORE_REVIEW_DEMO_ENABLED = originalDemoEnabled;
    process.env.STORE_REVIEW_DEMO_EMAIL = originalDemoEmail;
  });

  describe("blockUser", () => {
    it("blocks a user, invalidates active sessions, and logs action when caller is admin", async () => {
      const result = await blockUser("user-2");

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-2" },
        data: {
          isBlocked: true,
          sessions_invalidated_after: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
      expect(mockLogAdminActivity).toHaveBeenCalledWith(
        "block-user",
        "admin-1",
      );
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/users");
    });

    it("returns false when session is missing", async () => {
      mockAuth.mockResolvedValue(null);

      expect(await blockUser("user-2")).toBe(false);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("returns false when caller attempts to block themselves", async () => {
      expect(await blockUser("admin-1")).toBe(false);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("returns false when manager attempts to block an admin", async () => {
      mockGetUserRole.mockImplementation(async (id: string) =>
        id === "admin-1" ? "manager" : "admin",
      );

      expect(await blockUser("other-admin")).toBe(false);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("returns false when caller lacks permission", async () => {
      mockGetUserRole.mockResolvedValue("user");

      expect(await blockUser("user-2")).toBe(false);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("unblockUser", () => {
    it("unblocks a user when caller is manager", async () => {
      mockGetUserRole.mockResolvedValue("manager");

      const result = await unblockUser("user-2");

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-2" },
        data: { isBlocked: false, updatedAt: expect.any(Date) },
      });
      expect(mockLogAdminActivity).toHaveBeenCalledWith(
        "unblock-user",
        "admin-1",
      );
    });
  });

  describe("isUserBlocked", () => {
    it("returns blocked status for an existing user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isBlocked: true });

      expect(await isUserBlocked("user-2")).toBe(true);
    });

    it("returns false when lookup fails", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("db error"));

      expect(await isUserBlocked("user-2")).toBe(false);
    });
  });

  describe("deleteUserAccount", () => {
    it("deletes the authenticated user's own account", async () => {
      const result = await deleteUserAccount("admin-1");

      expect(result).toEqual({ error: null });
      expect(mockExecuteDeletion).toHaveBeenCalledWith("admin-1");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/settings");
    });

    it("returns error when deleting another user's account", async () => {
      const result = await deleteUserAccount("other-user");

      expect(result).toEqual({
        error: "You can only delete your own account",
      });
      expect(mockExecuteDeletion).not.toHaveBeenCalled();
    });

    it("returns error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      expect(await deleteUserAccount("admin-1")).toEqual({
        error: "Not authenticated",
      });
    });

    it("simulates deletion without deleting the DB row for the active Store Review Demo account", async () => {
      process.env.STORE_REVIEW_DEMO_ENABLED = "true";
      delete process.env.STORE_REVIEW_DEMO_EMAIL;
      mockAuth.mockResolvedValue({
        user: { id: "demo-reviewer", email: "playreview@refreeg.com" },
      });

      const result = await deleteUserAccount("demo-reviewer");

      expect(result).toEqual({ error: null });
      expect(mockExecuteDeletion).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/settings");
    });

    it("executes real deletion for playreview@refreeg.com when STORE_REVIEW_DEMO_ENABLED is not 'true'", async () => {
      process.env.STORE_REVIEW_DEMO_ENABLED = "false";
      mockAuth.mockResolvedValue({
        user: { id: "demo-reviewer", email: "playreview@refreeg.com" },
      });

      const result = await deleteUserAccount("demo-reviewer");

      expect(result).toEqual({ error: null });
      expect(mockExecuteDeletion).toHaveBeenCalledWith("demo-reviewer");
    });

    it("executes real deletion for regular users even when STORE_REVIEW_DEMO_ENABLED is 'true'", async () => {
      process.env.STORE_REVIEW_DEMO_ENABLED = "true";
      mockAuth.mockResolvedValue({
        user: { id: "regular-user", email: "donor@example.com" },
      });

      const result = await deleteUserAccount("regular-user");

      expect(result).toEqual({ error: null });
      expect(mockExecuteDeletion).toHaveBeenCalledWith("regular-user");
    });
  });

  describe("deleteUserAsAdmin", () => {
    it("deletes a user when caller is admin", async () => {
      const result = await deleteUserAsAdmin("user-2");

      expect(result).toEqual({ error: null });
      expect(mockLogAdminActivity).toHaveBeenCalledWith(
        "delete-user",
        "admin-1",
      );
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/users");
    });

    it("returns error when caller attempts to delete themselves", async () => {
      const result = await deleteUserAsAdmin("admin-1");

      expect(result.error).toContain("cannot delete your own account");
      expect(mockExecuteDeletion).not.toHaveBeenCalled();
    });

    it("returns error when manager attempts to delete an admin", async () => {
      mockGetUserRole.mockImplementation(async (id: string) =>
        id === "admin-1" ? "manager" : "admin",
      );

      const result = await deleteUserAsAdmin("other-admin");

      expect(result).toEqual({
        error: "Unauthorized: Managers cannot delete admin accounts",
      });
      expect(mockExecuteDeletion).not.toHaveBeenCalled();
    });

    it("returns error when caller is not admin or manager", async () => {
      mockGetUserRole.mockResolvedValue("user");

      const result = await deleteUserAsAdmin("user-2");

      expect(result).toEqual({
        error: "Unauthorized: Only admins and managers can delete users",
      });
      expect(mockExecuteDeletion).not.toHaveBeenCalled();
    });
  });
});
