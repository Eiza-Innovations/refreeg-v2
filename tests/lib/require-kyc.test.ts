import { requireKycAndProfile } from "@/lib/auth/require-kyc";
import { organizationVerificationSchema } from "@/lib/schemas/organization-verification.schema";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    kyc_verifications: { findFirst: jest.fn() },
  },
}));

const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockKycFindFirst = prisma.kyc_verifications.findFirst as jest.Mock;

describe("requireKycAndProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows an approved organization without individual kyc_verifications", async () => {
    mockUserFindUnique.mockResolvedValue({
      accountType: "organization",
      fullName: null,
      profilePhoto: null,
      ownedOrganization: { verificationStatus: "approved" },
    });

    await expect(requireKycAndProfile("user-1")).resolves.toBeNull();
    expect(mockKycFindFirst).not.toHaveBeenCalled();
  });

  it("redirects pending organization to KYC settings", async () => {
    mockUserFindUnique.mockResolvedValue({
      accountType: "organization",
      fullName: null,
      profilePhoto: null,
      ownedOrganization: { verificationStatus: "pending" },
    });

    await expect(requireKycAndProfile("user-1")).resolves.toBe(
      "/dashboard/settings/kyc?error=kyc_pending",
    );
  });

  it("redirects unverified organization to KYC settings", async () => {
    mockUserFindUnique.mockResolvedValue({
      accountType: "organization",
      fullName: null,
      profilePhoto: null,
      ownedOrganization: { verificationStatus: "unverified" },
    });

    await expect(requireKycAndProfile("user-1")).resolves.toBe(
      "/dashboard/settings/kyc?error=kyc_required",
    );
  });

  it("redirects organization without org record to onboarding", async () => {
    mockUserFindUnique.mockResolvedValue({
      accountType: "organization",
      fullName: null,
      profilePhoto: null,
      ownedOrganization: null,
    });

    await expect(requireKycAndProfile("user-1")).resolves.toBe("/onboarding");
  });
});

describe("organizationVerificationSchema", () => {
  it("requires CAC certificate, CAC status report, and at least one director ID", () => {
    const missing = organizationVerificationSchema.safeParse({
      registrationDocKey: "",
      statusReportDocKey: "",
      directorIdKeys: [],
    });
    expect(missing.success).toBe(false);

    const valid = organizationVerificationSchema.safeParse({
      registrationDocKey: "organizations/u1/cert.pdf",
      statusReportDocKey: "organizations/u1/status.pdf",
      directorIdKeys: ["organizations/u1/director-nin.jpg"],
    });
    expect(valid.success).toBe(true);
  });
});
