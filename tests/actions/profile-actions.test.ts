/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    kyc_verifications: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    donation: { count: jest.fn() },
    organization: { findFirst: jest.fn() },
  },
}));

jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/s3/s3-utils", () => ({
  uploadToS3: jest.fn(),
  generateS3Key: jest.fn(() => "profiles/user-1/photo.jpg"),
}));

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import {
  getProfile,
  hasBankDetails,
  updateProfile,
  checkUsernameAvailability,
  isProfileComplete,
  hasCompletedOnboarding,
  getCurrentOnboardingStep,
  getOnboardingData,
  getOrganizationOnboardingData,
  getOnboardingProgress,
} from "@/actions/users/profile-actions";

const mockPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock; update: jest.Mock };
  kyc_verifications: { findFirst: jest.Mock; update: jest.Mock };
  donation: { count: jest.Mock };
  organization: { findFirst: jest.Mock };
};

const baseUser = {
  id: "user-1",
  email: "user@test.com",
  fullName: "Test User",
  firstName: "Test",
  lastName: "User",
  username: "testuser",
  phone: "08012345678",
  location: "Lagos",
  accountNumber: "1234567890",
  bankName: "Test Bank",
  accountName: "Test User",
  subAccountCode: "SUB_123",
  profilePhoto: "profiles/user-1/photo.jpg",
  isBlocked: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  accountType: "individual",
  isVerified: true,
  gender: "male",
  bio: "Hello",
  solana_wallet: "sol-wallet",
  twitter_url: null,
  facebook_url: null,
  instagram_url: null,
  linkedin_url: null,
};

describe("profile-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mutating actions enforce session ownership; tests act as user-1.
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
  });

  describe("getProfile", () => {
    it("returns mapped profile when user exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await getProfile("user-1");

      expect(result).toMatchObject({
        id: "user-1",
        email: "user@test.com",
        full_name: "Test User",
        username: "testuser",
      });
    });

    it("counts donations with an indexed per-user query, not a _count include", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.donation.count.mockResolvedValue(4);

      const result = await getProfile("user-1");

      expect(result?.causes_count).toBe(4);
      expect(mockPrisma.donation.count).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        omit: { password: true },
      });
    });

    it("returns null when user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getProfile("missing");

      expect(result).toBeNull();
    });
  });

  describe("hasBankDetails", () => {
    it("returns true when account number and bank name are set", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await hasBankDetails("user-1");

      expect(result).toBe(true);
    });

    it("returns false when bank details are missing", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        accountNumber: null,
        bankName: null,
      });

      const result = await hasBankDetails("user-1");

      expect(result).toBe(false);
    });
  });

  describe("updateProfile", () => {
    it("updates profile and revalidates paths", async () => {
      mockPrisma.user.update.mockResolvedValue(baseUser);

      const result = await updateProfile("user-1", {
        name: "Test User",
        email: "user@test.com",
        username: "testuser",
        phone: "08012345678",
        bio: "Hello",
        account_type: "individual",
        profile_photo: "profiles/user-1/photo.jpg",
      });

      expect(result.full_name).toBe("Test User");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/settings");
      expect(revalidatePath).toHaveBeenCalledWith("/profile/user-1");
    });
  });

  describe("checkUsernameAvailability", () => {
    it("returns true when username is available", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await checkUsernameAvailability("newuser");

      expect(result).toBe(true);
    });

    it("returns false when username is taken", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "other-user" });

      const result = await checkUsernameAvailability("testuser");

      expect(result).toBe(false);
    });
  });

  describe("isProfileComplete", () => {
    it("returns complete when full name and photo exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Test User",
        profilePhoto: "photo.jpg",
      });

      const result = await isProfileComplete("user-1");

      expect(result).toEqual({ isComplete: true, missingFields: [] });
    });

    it("returns missing fields when profile is incomplete", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "",
        profilePhoto: null,
      });

      const result = await isProfileComplete("user-1");

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toEqual(
        expect.arrayContaining(["full name", "profile picture"]),
      );
    });
  });

  describe("hasCompletedOnboarding", () => {
    it("returns true when onboarding_completed is true", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Test User",
        phone: "08012345678",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        location: "Lagos",
        createdAt: new Date("2026-01-01"),
        onboarding_completed: true,
      });

      const result = await hasCompletedOnboarding("user-1");

      expect(result).toBe(true);
    });

    it("returns false when onboarding_completed is false for a recent account", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Test User",
        phone: "08012345678",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        location: "Lagos",
        createdAt: new Date("2026-01-01"),
        onboarding_completed: false,
      });

      const result = await hasCompletedOnboarding("user-1");

      expect(result).toBe(false);
    });

    it("returns true for legacy accounts predating the onboarding wizard", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Test User",
        phone: "08012345678",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        location: "Lagos",
        createdAt: new Date("2024-01-01"),
        onboarding_completed: false,
      });

      const result = await hasCompletedOnboarding("user-1");

      expect(result).toBe(true);
    });

    it("returns false when profile does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await hasCompletedOnboarding("user-1");

      expect(result).toBe(false);
    });
  });

  describe("getCurrentOnboardingStep", () => {
    it("returns step 1 when account type is missing", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        accountType: null,
        gender: null,
        firstName: null,
        lastName: null,
        username: null,
        location: null,
        phone: null,
        email: null,
        profilePhoto: null,
      });

      const result = await getCurrentOnboardingStep("user-1");

      expect(result).toBe(1);
    });

    it("returns step 4 when all onboarding data is complete", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        accountType: "individual",
        gender: "male",
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        location: "Lagos",
        phone: "08012345678",
        email: "user@test.com",
        profilePhoto: "photo.jpg",
      });

      const result = await getCurrentOnboardingStep("user-1");

      expect(result).toBe(4);
    });
  });

  describe("getCurrentOnboardingStep for organisations", () => {
    const orgUser = {
      accountType: "organization",
      gender: null,
      firstName: null,
      lastName: null,
      username: null,
      location: null,
      phone: null,
      email: null,
      profilePhoto: null,
    };

    it("resumes at CSR setup when the purpose was never chosen and no budget is saved", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(orgUser);
      mockPrisma.organization.findFirst.mockResolvedValue({
        purpose: "",
        csrBudget: null,
      });

      expect(await getCurrentOnboardingStep("user-1")).toBe(3.6);
    });

    it("skips CSR setup for a fundraising-only organisation", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(orgUser);
      mockPrisma.organization.findFirst.mockResolvedValue({
        purpose: "fundraising",
        csrBudget: null,
      });

      expect(await getCurrentOnboardingStep("user-1")).toBe(3.7);
    });

    it("goes to the checklist once a budget is saved", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(orgUser);
      mockPrisma.organization.findFirst.mockResolvedValue({
        purpose: "",
        csrBudget: 5000000,
      });

      expect(await getCurrentOnboardingStep("user-1")).toBe(3.7);
    });
  });

  describe("getOrganizationOnboardingData", () => {
    it("returns the saved CSR setup so the step can be refilled", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue({
        id: "org-1",
        name: "Kora",
        preferences: null,
        csrBudget: { toString: () => "5000000", valueOf: () => 5000000 },
        csrFinancialYearStart: "January",
        csrFocusCauses: ["education"],
      });

      const result = await getOrganizationOnboardingData("user-1");

      expect(result).toEqual(
        expect.objectContaining({
          csrBudget: 5000000,
          csrFinancialYearStart: "January",
          csrFocusCauses: ["education"],
        }),
      );
    });

    it("reports no budget as null rather than zero", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue({
        id: "org-1",
        name: "Kora",
        preferences: null,
        csrBudget: null,
        csrFinancialYearStart: null,
        csrFocusCauses: null,
      });

      const result = await getOrganizationOnboardingData("user-1");

      expect(result).toEqual(
        expect.objectContaining({
          csrBudget: null,
          csrFinancialYearStart: "",
          csrFocusCauses: [],
        }),
      );
    });
  });

  describe("getOnboardingProgress", () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      jest.spyOn(console, "error").mockImplementation(() => {});
    });

    it("throws on a database failure instead of defaulting to step 1", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(
        new Error("Server has closed the connection"),
      );

      await expect(getOnboardingProgress("user-1")).rejects.toThrow(
        "Server has closed the connection",
      );
      // The older helpers keep their forgiving fallback for other callers.
      await expect(getCurrentOnboardingStep("user-1")).resolves.toBe(1);
      await expect(hasCompletedOnboarding("user-1")).resolves.toBe(false);
    });

    it("reports a finished account without loading the rest", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        onboarding_completed: true,
        createdAt: new Date(),
      });

      await expect(getOnboardingProgress("user-1")).resolves.toEqual({
        completed: true,
      });
    });

    it("refuses to read someone else's progress", async () => {
      await expect(getOnboardingProgress("someone-else")).rejects.toThrow(
        "You can only manage your own profile.",
      );
    });
  });

  describe("getOnboardingData", () => {
    it("selects and returns bio and displayName alongside other profile fields", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        accountType: "individual",
        gender: "female",
        firstName: "Amina",
        lastName: "Bello",
        displayName: "Amina B.",
        username: "aminabello",
        bio: "Medical outreach volunteer.",
        location: "Lagos",
        phone: "08012345678",
        email: "amina@refreeg.com",
        profilePhoto: "uploads/profiles/user-1/images/avatar.jpg",
      });

      const result = await getOnboardingData("user-1");

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: expect.objectContaining({
          bio: true,
          displayName: true,
        }),
      });
      expect(result).toEqual({
        accountType: "individual",
        organizationPurpose: "",
        gender: "female",
        profile: {
          firstName: "Amina",
          lastName: "Bello",
          displayName: "Amina B.",
          username: "aminabello",
          bio: "Medical outreach volunteer.",
          location: "Lagos",
          phone: "08012345678",
          email: "amina@refreeg.com",
          profilePhoto: "uploads/profiles/user-1/images/avatar.jpg",
        },
      });
    });

    it("defaults bio and displayName to empty strings when missing", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getOnboardingData("user-1");

      expect(result.profile.bio).toBe("");
      expect(result.profile.displayName).toBe("");
    });
  });
});
