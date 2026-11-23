// ── Mock next/server BEFORE importing the route ───────────────────────────────
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      json: () => Promise.resolve(body),
    }),
  },
  NextRequest: class {},
}));

jest.mock("@/lib/auth/mobile-auth", () => ({
  authenticateMobileRequest: jest.fn(),
}));

jest.mock("@/actions/users/profile-actions", () => ({
  getOnboardingData: jest.fn(),
  getCurrentOnboardingStep: jest.fn(),
  checkUsernameAvailability: jest.fn(),
}));

jest.mock("@/lib/users/profile-core", () => {
  const actual = jest.requireActual("@/lib/users/profile-core");
  return {
    ...actual,
    createOnboardingProfileCore: jest.fn(),
  };
});

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organizationMember: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/mobile/onboarding/route";
import { POST as postOrganization } from "@/app/api/mobile/onboarding/organization/route";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  getOnboardingData,
  getCurrentOnboardingStep,
  checkUsernameAvailability,
} from "@/actions/users/profile-actions";
import {
  createOnboardingProfileCore,
  OnboardingValidationError,
} from "@/lib/users/profile-core";
import { prisma } from "@/lib/prisma";

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: {
      get: () => null,
    },
  } as unknown as NextRequest;
}

describe("Mobile Onboarding API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authenticateMobileRequest as jest.Mock).mockResolvedValue({
      user: { id: "user-1", email: "amina@refreeg.com" },
      errorResponse: null,
    });
  });

  describe("GET /api/mobile/onboarding", () => {
    it("returns onboarding data including bio, displayName, and accountType", async () => {
      (getOnboardingData as jest.Mock).mockResolvedValue({
        accountType: "individual",
        gender: "female",
        profile: {
          firstName: "Amina",
          lastName: "Bello",
          displayName: "Amina",
          username: "aminabello123",
          bio: "Community volunteer in Lagos",
          location: "Lekki, Lagos",
          phone: "",
          email: "amina@refreeg.com",
        },
      });
      (getCurrentOnboardingStep as jest.Mock).mockResolvedValue(2);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        accountType: "individual",
        interests: ["education"],
        onboarding_completed: false,
      });

      const req = makeRequest();
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.accountType).toBe("individual");
      expect(body.data.currentStep).toBe(2);
      expect(body.data.data.profile.bio).toBe("Community volunteer in Lagos");
      expect(body.data.data.profile.displayName).toBe("Amina");
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: {
          accountType: true,
          interests: true,
          onboarding_completed: true,
        },
      });
    });
  });

  describe("POST /api/mobile/onboarding", () => {
    it("returns 400 when profileData is missing", async () => {
      const req = makeRequest({});
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("Missing required field");
    });

    it("returns 400 when createOnboardingProfile rejects an under-18 dateOfBirth", async () => {
      (createOnboardingProfileCore as jest.Mock).mockRejectedValue(
        new Error("You need to be 18 or over to use RefreeG."),
      );

      const req = makeRequest({
        profileData: {
          fullName: "Amina Bello",
          dateOfBirth: "14/08/2012",
          accountType: "individual",
        },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("You need to be 18 or over to use RefreeG.");
    });

    it("returns 400 when createOnboardingProfile rejects a single-word name", async () => {
      (createOnboardingProfileCore as jest.Mock).mockRejectedValue(
        new Error("Enter your first and last name, as on your ID."),
      );

      const req = makeRequest({
        profileData: {
          fullName: "Amina",
          dateOfBirth: "14/08/1996",
          accountType: "individual",
        },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Enter your first and last name, as on your ID.");
    });

    it("saves profileData successfully and returns 200", async () => {
      (checkUsernameAvailability as jest.Mock).mockResolvedValue(true);
      (createOnboardingProfileCore as jest.Mock).mockResolvedValue({
        id: "user-1",
        firstName: "Amina",
        lastName: "Bello",
        fullName: "Amina Bello",
        accountType: "individual",
        location: "Lekki, Lagos",
      });

      const req = makeRequest({
        profileData: {
          fullName: "Amina Bello",
          gender: "female",
          dateOfBirth: "14/08/1996",
          accountType: "individual",
          state: "Lagos",
          city: "Lekki",
        },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.fullName).toBe("Amina Bello");
      expect(createOnboardingProfileCore).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          fullName: "Amina Bello",
          accountType: "individual",
          state: "Lagos",
          city: "Lekki",
        }),
        null,
      );
    });

    it("forwards valid profilePhoto S3 key, bio, and displayName without overwriting via oauthAvatarUrl", async () => {
      (checkUsernameAvailability as jest.Mock).mockResolvedValue(true);
      (createOnboardingProfileCore as jest.Mock).mockResolvedValue({
        id: "user-1",
        bio: "Helping local clinics.",
        displayName: "Amina B.",
        profilePhoto: "uploads/profiles/user-1/images/avatar.jpg",
      });

      const req = makeRequest({
        profileData: {
          firstName: "Amina",
          lastName: "Bello",
          displayName: " Amina B. ",
          bio: " Helping local clinics. ",
          accountType: "individual",
          profilePhoto: "uploads/profiles/user-1/images/avatar.jpg",
        },
        oauthAvatarUrl: "https://lh3.googleusercontent.com/google-avatar",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(createOnboardingProfileCore).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          displayName: "Amina B.",
          bio: "Helping local clinics.",
          profilePhoto: "uploads/profiles/user-1/images/avatar.jpg",
        }),
        "https://lh3.googleusercontent.com/google-avatar",
      );
    });

    it("rejects a foreign profilePhoto S3 key with 400", async () => {
      const req = makeRequest({
        profileData: {
          firstName: "Amina",
          lastName: "Bello",
          accountType: "individual",
          profilePhoto: "uploads/profiles/other-user/images/avatar.jpg",
        },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Invalid profile photo upload key");
      expect(createOnboardingProfileCore).not.toHaveBeenCalled();
    });

    it("rejects non-string or oversized bio and displayName with 400", async () => {
      const badBioTypeRes = await POST(
        makeRequest({
          profileData: { firstName: "Amina", bio: 123 },
        }),
      );
      expect(badBioTypeRes.status).toBe(400);

      const longBioRes = await POST(
        makeRequest({
          profileData: { firstName: "Amina", bio: "a".repeat(501) },
        }),
      );
      expect(longBioRes.status).toBe(400);

      const longDisplayNameRes = await POST(
        makeRequest({
          profileData: { firstName: "Amina", displayName: "a".repeat(101) },
        }),
      );
      expect(longDisplayNameRes.status).toBe(400);

      const nonStringFirstNameRes = await POST(
        makeRequest({
          profileData: { firstName: 123 },
        }),
      );
      expect(nonStringFirstNameRes.status).toBe(400);

      const malformedJsonReq = {
        json: jest.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
        headers: { get: () => null },
      } as unknown as NextRequest;
      const malformedRes = await POST(malformedJsonReq);
      expect(malformedRes.status).toBe(400);
      expect(createOnboardingProfileCore).not.toHaveBeenCalled();
    });

    it("rejects untrusted oauthAvatarUrl hosts like sites.googleusercontent.com with 400", async () => {
      const res = await POST(
        makeRequest({
          profileData: { firstName: "Amina", lastName: "Bello" },
          oauthAvatarUrl: "https://sites.googleusercontent.com/avatar.png",
        }),
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Invalid OAuth avatar URL");
      expect(createOnboardingProfileCore).not.toHaveBeenCalled();
    });

    it("returns 409 on username conflict and avoids leaking raw Prisma error messages on 500", async () => {
      (checkUsernameAvailability as jest.Mock).mockResolvedValueOnce(false);
      const conflictCheckRes = await POST(
        makeRequest({
          profileData: { username: "Amina_Bello" },
        }),
      );
      expect(conflictCheckRes.status).toBe(409);

      (checkUsernameAvailability as jest.Mock).mockResolvedValueOnce(true);
      (createOnboardingProfileCore as jest.Mock).mockRejectedValueOnce(
        new OnboardingValidationError(
          "This username is already taken. Please choose another.",
          409,
        ),
      );
      const conflictCoreRes = await POST(
        makeRequest({
          profileData: { username: "amina_bello" },
        }),
      );
      expect(conflictCoreRes.status).toBe(409);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      (createOnboardingProfileCore as jest.Mock).mockRejectedValueOnce(
        new Error("Prisma secret connection string error"),
      );
      const unexpectedRes = await POST(
        makeRequest({
          profileData: { firstName: "Amina" },
        }),
      );
      const unexpectedBody = await unexpectedRes.json();

      expect(unexpectedRes.status).toBe(500);
      expect(unexpectedBody.error).toBe("Internal server error");
      consoleSpy.mockRestore();
    });
  });

  describe("POST /api/mobile/onboarding/organization", () => {
    it("creates an organization with type and role and marks user as organization", async () => {
      (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prisma.organization.create as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Bello Community Foundation",
        slug: "bello-community-foundation-1234",
        industry: "Registered NGO / non-profit",
        address: "Yaba, Lagos",
        websiteUrl: null,
      });
      (prisma.organizationMember.create as jest.Mock).mockResolvedValue({
        id: "mem-1",
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: "user-1",
        accountType: "organization",
      });

      const req = makeRequest({
        name: "Bello Community Foundation",
        type: "Registered NGO / non-profit",
        role: "Executive Director",
        address: "Yaba, Lagos",
      });
      const res = await postOrganization(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.organization.name).toBe("Bello Community Foundation");
      expect(body.data.organization.industry).toBe(
        "Registered NGO / non-profit",
      );
      expect(prisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Bello Community Foundation",
            industry: "Registered NGO / non-profit",
            preferences: expect.objectContaining({
              ownerRole: "Executive Director",
            }),
          }),
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { accountType: "organization" },
      });
    });
  });
});
