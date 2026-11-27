jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/s3/s3-utils", () => ({
  extractS3Key: jest.fn((raw?: string | null) => {
    if (!raw) return null;
    if (raw.startsWith("uploads/")) return raw;
    if (raw.startsWith("https://bucket.s3.amazonaws.com/uploads/")) {
      return raw.replace("https://bucket.s3.amazonaws.com/", "");
    }
    return null;
  }),
  uploadToS3: jest.fn(),
  generateS3Key: jest.fn(
    ({ userId, filename }: { userId: string; filename: string }) =>
      `uploads/profiles/${userId}/${userId}/images/${filename}`,
  ),
}));

import { prisma } from "@/lib/prisma";
import { uploadToS3 } from "@/lib/s3/s3-utils";
import {
  createOnboardingProfileCore,
  OnboardingValidationError,
} from "@/lib/users/profile-core";

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

describe("createOnboardingProfileCore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.update.mockImplementation(async ({ data }) => ({
      id: "user-1",
      ...data,
    }));
  });

  it("rejects names longer than 60 characters before saving anything", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      profilePhoto: null,
      accountType: "individual",
    });

    await expect(
      createOnboardingProfileCore("user-1", {
        firstName: "Amina",
        lastName: "B".repeat(61),
        username: "amina_bello",
        location: "Lagos",
        phone: "+2348000000000",
        email: "amina@refreeg.com",
        accountType: "individual",
      }),
    ).rejects.toThrow("Names must be 60 characters or fewer");
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("persists trimmed bio, displayName, and normalized username using a safe non-PII select", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      profilePhoto: null,
      accountType: "individual",
    });

    await createOnboardingProfileCore("user-1", {
      firstName: "Amina",
      lastName: "Bello",
      displayName: "  Amina B.  ",
      username: "  Amina_Bello1  ",
      bio: "  Community builder in Lagos.  ",
      location: "Lekki, Lagos",
      phone: "+2348000000000",
      email: "amina@refreeg.com",
      accountType: "individual",
      gender: "female",
    });

    const callArg = mockPrisma.user.update.mock.calls[0][0];
    expect(callArg.where).toEqual({ id: "user-1" });
    expect(callArg.data).toEqual(
      expect.objectContaining({
        firstName: "Amina",
        lastName: "Bello",
        fullName: "Amina Bello",
        displayName: "Amina B.",
        username: "amina_bello1",
        bio: "Community builder in Lagos.",
        location: "Lekki, Lagos",
        onboarding_completed: false,
      }),
    );
    expect(callArg.select).toEqual(
      expect.objectContaining({
        id: true,
        bio: true,
        displayName: true,
        profilePhoto: true,
      }),
    );
    expect(callArg.select.password).toBeUndefined();
    expect(callArg.select.sessions_invalidated_after).toBeUndefined();
    expect(callArg.select.subAccountCode).toBeUndefined();
  });

  it("caps bio at 500 chars and displayName at 100 chars", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      profilePhoto: null,
      accountType: "individual",
    });

    await createOnboardingProfileCore("user-1", {
      firstName: "Amina",
      lastName: "Bello",
      displayName: "D".repeat(120),
      username: "aminabello",
      bio: "B".repeat(550),
      location: "Lagos",
      phone: "",
      email: "amina@refreeg.com",
      accountType: "individual",
    });

    const callArg = mockPrisma.user.update.mock.calls[0][0];
    expect(callArg.data.bio).toHaveLength(500);
    expect(callArg.data.displayName).toHaveLength(100);
  });

  it("overrides an existing OAuth avatar when profileData.profilePhoto is a user-owned S3 key", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      profilePhoto: "https://lh3.googleusercontent.com/old-google-avatar",
      accountType: "individual",
    });

    const newKey = "uploads/profiles/user-1/images/custom-avatar.jpg";
    await createOnboardingProfileCore(
      "user-1",
      {
        firstName: "Amina",
        lastName: "Bello",
        username: "aminabello",
        location: "Lagos",
        phone: "",
        email: "amina@refreeg.com",
        accountType: "individual",
        profilePhoto: newKey,
      },
      "https://lh3.googleusercontent.com/old-google-avatar",
    );

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profilePhoto: newKey,
        }),
      }),
    );
  });

  it("rejects foreign, bare-prefix, and traversal profilePhoto keys", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      profilePhoto: null,
      accountType: "individual",
    });

    for (const badKey of [
      "uploads/profiles/other-user/images/hacked.jpg",
      "uploads/profiles/user-1/../other-user/hacked.jpg",
      "uploads/profiles/user-1/%2e%2e/other-user/hacked.jpg",
      "uploads/profiles/user-1/",
    ]) {
      await expect(
        createOnboardingProfileCore("user-1", {
          firstName: "Amina",
          lastName: "Bello",
          username: "aminabello",
          location: "Lagos",
          phone: "",
          email: "amina@refreeg.com",
          accountType: "individual",
          profilePhoto: badKey,
        }),
      ).rejects.toThrow("Invalid profile photo upload key");
    }

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("validates oauthAvatarUrl when used directly and rejects untrusted hosts", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      profilePhoto: null,
      accountType: "individual",
    });

    await expect(
      createOnboardingProfileCore(
        "user-1",
        {
          firstName: "Amina",
          lastName: "Bello",
          username: "aminabello",
          location: "Lagos",
          phone: "",
          email: "amina@refreeg.com",
          accountType: "individual",
          profilePhoto: "",
        },
        "https://sites.googleusercontent.com/evil",
      ),
    ).rejects.toThrow("Invalid OAuth avatar URL");

    await createOnboardingProfileCore(
      "user-1",
      {
        firstName: "Amina",
        lastName: "Bello",
        username: "aminabello",
        location: "Lagos",
        phone: "",
        email: "amina@refreeg.com",
        accountType: "individual",
        profilePhoto: "",
      },
      "https://lh3.googleusercontent.com/good-avatar",
    );

    expect(mockPrisma.user.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profilePhoto: "https://lh3.googleusercontent.com/good-avatar",
        }),
      }),
    );
  });

  it("preserves existing profilePhoto when only oauthAvatarUrl is provided, and normalizes owned S3 URLs", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      profilePhoto: "uploads/profiles/user-1/images/existing.jpg",
      accountType: "individual",
    });

    await createOnboardingProfileCore(
      "user-1",
      {
        firstName: "Amina",
        lastName: "Bello",
        username: "aminabello",
        location: "Lagos",
        phone: "",
        email: "amina@refreeg.com",
        accountType: "individual",
      },
      "https://lh3.googleusercontent.com/google-avatar",
    );

    expect(mockPrisma.user.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profilePhoto: "uploads/profiles/user-1/images/existing.jpg",
        }),
      }),
    );

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      profilePhoto: null,
      accountType: "individual",
    });

    await createOnboardingProfileCore(
      "user-1",
      {
        firstName: "Amina",
        lastName: "Bello",
        username: "aminabello",
        location: "Lagos",
        phone: "",
        email: "amina@refreeg.com",
        accountType: "individual",
      },
      "https://bucket.s3.amazonaws.com/uploads/profiles/user-1/images/legacy.jpg",
    );

    expect(mockPrisma.user.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profilePhoto: "uploads/profiles/user-1/images/legacy.jpg",
        }),
      }),
    );
  });

  it("validates web File uploads against upload-policy before uploading to S3", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      profilePhoto: null,
      accountType: "individual",
    });

    const svgFile = {
      name: "xss.svg",
      type: "image/svg+xml",
      size: 128,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    } as unknown as File;

    await expect(
      createOnboardingProfileCore("user-1", {
        firstName: "Amina",
        lastName: "Bello",
        username: "aminabello",
        location: "Lagos",
        phone: "",
        email: "amina@refreeg.com",
        accountType: "individual",
        profilePhoto: svgFile,
      }),
    ).rejects.toThrow("Unsupported file type for images");

    expect(uploadToS3).not.toHaveBeenCalled();

    const pngFile = {
      name: "avatar.png",
      type: "image/png",
      size: 512,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    } as unknown as File;

    await createOnboardingProfileCore("user-1", {
      firstName: "Amina",
      lastName: "Bello",
      username: "aminabello",
      location: "Lagos",
      phone: "",
      email: "amina@refreeg.com",
      accountType: "individual",
      profilePhoto: pngFile,
    });

    expect(uploadToS3).toHaveBeenCalledTimes(1);
  });

  it("preserves organization accountType and validates accountType and username format", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      profilePhoto: null,
      accountType: "organization",
    });

    await createOnboardingProfileCore("user-1", {
      firstName: "Amina",
      lastName: "Bello",
      username: "aminabello",
      location: "Lagos",
      phone: "",
      email: "amina@refreeg.com",
      accountType: "individual",
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountType: "organization",
        }),
      }),
    );

    mockPrisma.user.findUnique.mockResolvedValue({
      profilePhoto: null,
      accountType: null,
    });

    await expect(
      createOnboardingProfileCore("user-1", {
        firstName: "Amina",
        lastName: "Bello",
        username: "ab",
        location: "Lagos",
        phone: "",
        email: "amina@refreeg.com",
        accountType: "individual",
      }),
    ).rejects.toThrow(OnboardingValidationError);

    await expect(
      createOnboardingProfileCore("user-1", {
        firstName: "Amina",
        lastName: "Bello",
        username: "aminabello",
        location: "Lagos",
        phone: "",
        email: "amina@refreeg.com",
        accountType: "admin",
      }),
    ).rejects.toThrow("Invalid accountType");
  });

  it("maps Prisma P2002 unique violation to 409 OnboardingValidationError", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      profilePhoto: null,
      accountType: "individual",
    });
    mockPrisma.user.update.mockRejectedValueOnce({ code: "P2002" });

    await expect(
      createOnboardingProfileCore("user-1", {
        firstName: "Amina",
        lastName: "Bello",
        username: "takenname",
        location: "Lagos",
        phone: "",
        email: "amina@refreeg.com",
        accountType: "individual",
      }),
    ).rejects.toMatchObject({
      name: "OnboardingValidationError",
      statusCode: 409,
    });
  });
});
