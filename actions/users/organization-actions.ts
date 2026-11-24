"use server";

import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { sendOrganizationInvitationEmail } from "@/services/mail";

const MANAGER_ROLES = new Set(["owner", "admin"]);
const INVITATION_ROLES = new Set(["admin", "member", "approver", "viewer"]);

type OrganizationPreferences = {
  donationNotifications: boolean;
  teamDigest: boolean;
  publicProfile: boolean;
};

const DEFAULT_PREFERENCES: OrganizationPreferences = {
  donationNotifications: true,
  teamDigest: true,
  publicProfile: true,
};

function mapPreferences(value: unknown): OrganizationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_PREFERENCES;
  }

  const stored = value as Partial<OrganizationPreferences>;
  return {
    donationNotifications: stored.donationNotifications !== false,
    teamDigest: stored.teamDigest !== false,
    publicProfile: stored.publicProfile !== false,
  };
}

function normalizeOptionalUrl(value: string | undefined, label: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (!url.hostname || !["http:", "https:"].includes(url.protocol)) {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new Error(`Enter a valid ${label} URL.`);
  }
}

function normalizeOptionalWhatsAppNumber(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const normalized = `${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
  const digits = normalized.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    throw new Error("Enter a valid WhatsApp number with country code.");
  }

  return normalized;
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to manage an organization.");
  }
  return session.user;
}

async function requireOrganizationAccess(managersOnly = false) {
  const user = await requireUser();
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { joinedAt: "asc" },
  });

  if (!membership) {
    throw new Error("No organization workspace is linked to this account.");
  }
  if (managersOnly && !MANAGER_ROLES.has(membership.role)) {
    throw new Error(
      "Only organization owners and admins can make this change.",
    );
  }

  return { user, membership, organization: membership.organization };
}

export async function getOrganizationWorkspace() {
  try {
    const { membership, organization } = await requireOrganizationAccess();
    const canManage = MANAGER_ROLES.has(membership.role);

    const [members, invitations] = await Promise.all([
      prisma.organizationMember.findMany({
        where: { organizationId: organization.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              profilePhoto: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      }),
      canManage
        ? prisma.organizationInvitation.findMany({
            where: {
              organizationId: organization.id,
              status: "pending",
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    return {
      success: true as const,
      workspace: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        adminEmail: organization.adminEmail,
        phone: organization.phone || "",
        address: organization.address || "",
        industry: organization.industry || "",
        logoUrl: organization.logoUrl || "",
        bio: organization.bio || "",
        websiteUrl: organization.websiteUrl || "",
        instagramUrl: organization.instagramUrl || "",
        twitterUrl: organization.twitterUrl || "",
        tiktokUrl: organization.tiktokUrl || "",
        facebookUrl: organization.facebookUrl || "",
        whatsappNumber: organization.whatsappNumber || "",
        preferences: mapPreferences(organization.preferences),
        currentUserRole: membership.role,
        canManage,
        members: members.map((member) => ({
          id: member.id,
          role: member.role,
          joinedAt: member.joinedAt.toISOString(),
          user: member.user,
        })),
        invitations: invitations.map((invitation) => ({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Unable to load workspace.",
    };
  }
}

/**
 * Public, read-only organization identity for an owner's profile page.
 * Sensitive workspace data such as invitations and admin permissions is
 * intentionally excluded.
 */
export async function getOrganizationPublicProfile(ownerId: string) {
  try {
    const organization = await prisma.organization.findUnique({
      where: { ownerId },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        address: true,
        industry: true,
        logoUrl: true,
        bio: true,
        websiteUrl: true,
        instagramUrl: true,
        twitterUrl: true,
        tiktokUrl: true,
        facebookUrl: true,
        whatsappNumber: true,
        preferences: true,
        createdAt: true,
      },
    });

    if (!organization) return null;

    const memberCount = await prisma.organizationMember.count({
      where: { organizationId: organization.id },
    });

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      phone: organization.phone || "",
      address: organization.address || "",
      industry: organization.industry || "",
      logoUrl: organization.logoUrl || "",
      bio: organization.bio || "",
      websiteUrl: organization.websiteUrl || "",
      instagramUrl: organization.instagramUrl || "",
      twitterUrl: organization.twitterUrl || "",
      tiktokUrl: organization.tiktokUrl || "",
      facebookUrl: organization.facebookUrl || "",
      whatsappNumber: organization.whatsappNumber || "",
      memberCount,
      publicProfile: mapPreferences(organization.preferences).publicProfile,
      createdAt: organization.createdAt.toISOString(),
    };
  } catch (error) {
    console.error("Unable to load public organization profile:", error);
    return null;
  }
}

/**
 * Search organizations by name for the Discover ⌘K overlay. Verified status
 * comes from the organisation's own verification (registration documents
 * reviewed by admins), not the owner's personal KYC.
 */
export async function searchOrganizations(query: string, limit = 4) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const organizations = await prisma.organization.findMany({
      where: { name: { contains: trimmed, mode: "insensitive" } },
      take: limit,
      select: {
        id: true,
        name: true,
        logoUrl: true,
        verificationStatus: true,
        owner: { select: { username: true } },
      },
    });

    return organizations.map((org) => ({
      id: org.id,
      name: org.name,
      logoUrl: org.logoUrl || null,
      username: org.owner?.username || null,
      isVerified: org.verificationStatus === "approved",
    }));
  } catch (error) {
    console.error("Unable to search organizations:", error);
    return [];
  }
}

function createOrganizationSlug(name: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return `${base || "organization"}-${crypto.randomUUID().slice(0, 8)}`;
}

export type SaveOrganizationDetailsInput = {
  name: string;
  adminEmail: string;
  organisationType?: string;
  registrationNumber?: string;
  country?: string;
  purpose?: string;
  contactName?: string;
  contactRole?: string;
  phone?: string;
  address?: string;
  industry?: string;
  bio?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  whatsappNumber?: string;
  username?: string;
  preferences?: OrganizationPreferences;
};

const ORGANIZATION_PURPOSES = new Set(["fundraising", "csr", "both"]);

// Username pattern lives in profile-core (3-30 chars, letters, numbers and
// underscores); derive one from the organisation name for owners who never
// go through a profile step.
async function generateOwnerUsername(organizationName: string) {
  const base =
    organizationName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 20) || "org";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base}_${crypto.randomUUID().slice(0, 6)}`;
    const taken = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}_${Date.now().toString(36)}`;
}

export async function updateOrganization(input: SaveOrganizationDetailsInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("You must be signed in.");

    let organization: any = null;
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
      orderBy: { joinedAt: "asc" },
    });

    if (membership) {
      if (!MANAGER_ROLES.has(membership.role)) {
        throw new Error(
          "Only organization owners and admins can make this change.",
        );
      }
      organization = membership.organization;
    }

    const name = input.name?.trim();
    const adminEmail = input.adminEmail?.trim().toLowerCase();

    if (!name || name.length < 2 || name.length > 120) {
      throw new Error(
        "Organization name must be between 2 and 120 characters.",
      );
    }
    if (!/^\S+@\S+\.\S+$/.test(adminEmail)) {
      throw new Error("Enter a valid admin email address.");
    }
    if (
      input.purpose !== undefined &&
      input.purpose !== "" &&
      !ORGANIZATION_PURPOSES.has(input.purpose)
    ) {
      throw new Error("Invalid organisation purpose.");
    }
    const registrationNumber = input.registrationNumber?.trim() || null;
    if (registrationNumber && registrationNumber.length > 60) {
      throw new Error("Registration number must be 60 characters or fewer.");
    }
    const bio = input.bio === undefined ? undefined : input.bio.trim() || null;
    if (bio && bio.length > 600) {
      throw new Error("Organization bio must be 600 characters or fewer.");
    }
    const websiteUrl =
      input.websiteUrl === undefined
        ? undefined
        : normalizeOptionalUrl(input.websiteUrl, "website");
    const instagramUrl =
      input.instagramUrl === undefined
        ? undefined
        : normalizeOptionalUrl(input.instagramUrl, "Instagram");
    const twitterUrl =
      input.twitterUrl === undefined
        ? undefined
        : normalizeOptionalUrl(input.twitterUrl, "Twitter/X");
    const tiktokUrl =
      input.tiktokUrl === undefined
        ? undefined
        : normalizeOptionalUrl(input.tiktokUrl, "TikTok");
    const facebookUrl =
      input.facebookUrl === undefined
        ? undefined
        : normalizeOptionalUrl(input.facebookUrl, "Facebook");
    const whatsappNumber =
      input.whatsappNumber === undefined
        ? undefined
        : normalizeOptionalWhatsAppNumber(input.whatsappNumber);

    // Optional public handle for the owner's /[username] profile. Empty or
    // missing falls back to the generated owner username below.
    const desiredUsername = input.username?.trim().toLowerCase() || null;
    if (desiredUsername && !/^[a-z0-9_]{3,30}$/.test(desiredUsername)) {
      throw new Error(
        "Usernames use 3-30 lowercase letters, numbers or underscores.",
      );
    }
    if (desiredUsername) {
      const taken = await prisma.user.findUnique({
        where: { username: desiredUsername },
        select: { id: true },
      });
      if (taken && taken.id !== session.user.id) {
        throw new Error("That username is already taken.");
      }
    }

    if (!organization) {
      // First-time setup during onboarding: create the organization and assign ownership
      organization = await prisma.organization.create({
        data: {
          name,
          slug: createOrganizationSlug(name),
          adminEmail,
          phone: input.phone?.trim() || null,
          address: input.address?.trim() || null,
          industry: input.industry?.trim() || null,
          organisationType: input.organisationType?.trim() || null,
          registrationNumber,
          country: input.country?.trim() || null,
          purpose: input.purpose || null,
          contactRole: input.contactRole?.trim() || null,
          bio: bio ?? null,
          websiteUrl: websiteUrl ?? null,
          instagramUrl: instagramUrl ?? null,
          twitterUrl: twitterUrl ?? null,
          tiktokUrl: tiktokUrl ?? null,
          facebookUrl: facebookUrl ?? null,
          whatsappNumber: whatsappNumber ?? null,
          ownerId: session.user.id,
          preferences: mapPreferences(input.preferences),
        },
      });

      await prisma.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: session.user.id,
          role: "owner",
        },
      });
    } else {
      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          name,
          adminEmail,
          phone: input.phone?.trim() || null,
          address: input.address?.trim() || null,
          industry: input.industry?.trim() || null,
          organisationType: input.organisationType?.trim() || null,
          registrationNumber,
          country: input.country?.trim() || null,
          ...(input.purpose !== undefined
            ? { purpose: input.purpose || null }
            : {}),
          ...(input.contactRole !== undefined
            ? { contactRole: input.contactRole.trim() || null }
            : {}),
          ...(bio !== undefined ? { bio } : {}),
          ...(websiteUrl !== undefined ? { websiteUrl } : {}),
          ...(instagramUrl !== undefined ? { instagramUrl } : {}),
          ...(twitterUrl !== undefined ? { twitterUrl } : {}),
          ...(tiktokUrl !== undefined ? { tiktokUrl } : {}),
          ...(facebookUrl !== undefined ? { facebookUrl } : {}),
          ...(whatsappNumber !== undefined ? { whatsappNumber } : {}),
          ...(input.preferences !== undefined
            ? { preferences: mapPreferences(input.preferences) }
            : {}),
        },
      });
    }

    // The org wizard has no separate profile step, so keep the owner's
    // profile in sync: contact name here, and fill username, location and
    // phone when still empty so onboarding can complete.
    const owner = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, location: true, phone: true },
    });

    let finalUsername: string | null = owner?.username || null;
    const ownerData: Prisma.UserUpdateInput = { accountType: "organization" };

    if (input.contactName !== undefined) {
      const contactName = input.contactName.trim();
      if (contactName.length < 2) {
        throw new Error("Enter your name.");
      }
      const [firstName, ...rest] = contactName.split(" ");
      ownerData.fullName = contactName;
      ownerData.firstName = firstName;
      ownerData.lastName = rest.join(" ") || null;
    }
    if (desiredUsername) {
      ownerData.username = desiredUsername;
      finalUsername = desiredUsername;
    } else if (owner && !owner.username) {
      const generated = await generateOwnerUsername(name);
      ownerData.username = generated;
      finalUsername = generated;
    }
    if (owner && !owner.location && input.country?.trim()) {
      ownerData.location = input.country.trim();
    }
    if (owner && !owner.phone && input.phone?.trim()) {
      ownerData.phone = input.phone.trim();
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: ownerData,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/organization");
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    revalidatePath("/[username]", "page");
    return { success: true as const, username: finalUsername };
  } catch (error) {
    const isDatabaseError =
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      error instanceof Prisma.PrismaClientValidationError;

    return {
      success: false as const,
      error: isDatabaseError
        ? "Unable to save the organisation right now. Please try again."
        : error instanceof Error
          ? error.message
          : "Unable to save organization.",
    };
  }
}

// The logo goes browser → S3 directly (see lib/organization-logo-upload.ts); only the key comes here.
export async function updateOrganizationLogo(logoKey: string) {
  try {
    const { user, organization } = await requireOrganizationAccess(true);
    if (!isOwnUploadKey(logoKey, "organizations", user.id)) {
      throw new Error("Invalid logo upload.");
    }

    await prisma.organization.update({
      where: { id: organization.id },
      data: { logoUrl: logoKey },
    });

    revalidatePath("/dashboard/settings/organization");
    revalidatePath("/dashboard");
    return { success: true as const, logoUrl: logoKey };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unable to upload logo.",
    };
  }
}

export async function inviteOrganizationMember(input: {
  email: string;
  role: string;
}) {
  try {
    const { user, organization } = await requireOrganizationAccess(true);
    const email = input.email?.trim().toLowerCase();
    const role = input.role?.toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    if (!INVITATION_ROLES.has(role)) {
      throw new Error("Choose a valid role for this invitation.");
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingUser) {
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId: existingUser.id,
          },
        },
      });
      if (existingMember) {
        throw new Error("That email already belongs to a team member.");
      }
    }

    const pending = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId: organization.id,
        email: { equals: email, mode: "insensitive" },
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) {
      throw new Error("A pending invitation already exists for this email.");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: organization.id,
        email,
        role,
        token,
        invitedById: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const mailResult = await sendOrganizationInvitationEmail({
      email,
      inviterName: user.name || user.email || "An organization admin",
      organizationName: organization.name,
      role,
      invitationUrl: `${appUrl}/organization/invitations/${token}`,
    });

    revalidatePath("/dashboard/settings/organization");
    return {
      success: true as const,
      invitationId: invitation.id,
      warning: mailResult.success
        ? undefined
        : "The invitation was saved, but the email could not be delivered. Revoke it and try again after checking SMTP settings.",
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Unable to send invitation.",
    };
  }
}

export async function revokeOrganizationInvitation(invitationId: string) {
  try {
    const { organization } = await requireOrganizationAccess(true);
    const result = await prisma.organizationInvitation.updateMany({
      where: {
        id: invitationId,
        organizationId: organization.id,
        status: "pending",
      },
      data: { status: "revoked" },
    });
    if (result.count === 0) throw new Error("Pending invitation not found.");

    revalidatePath("/dashboard/settings/organization");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Unable to revoke invitation.",
    };
  }
}

export async function removeOrganizationMember(memberId: string) {
  try {
    const { organization } = await requireOrganizationAccess(true);
    const member = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: organization.id },
    });
    if (!member) throw new Error("Team member not found.");
    if (member.role === "owner") {
      throw new Error("The organization owner cannot be removed.");
    }

    await prisma.organizationMember.delete({ where: { id: member.id } });
    revalidatePath("/dashboard/settings/organization");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Unable to remove member.",
    };
  }
}

export async function getOrganizationInvitation(token: string) {
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
    include: { organization: { select: { name: true, logoUrl: true } } },
  });
  if (!invitation)
    return { success: false as const, error: "Invitation not found." };

  return {
    success: true as const,
    invitation: {
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expired: invitation.expiresAt <= new Date(),
      organization: invitation.organization,
    },
  };
}

export async function acceptOrganizationInvitation(token: string) {
  try {
    const user = await requireUser();
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token },
    });
    if (!invitation || invitation.status !== "pending") {
      throw new Error("This invitation is no longer available.");
    }
    if (invitation.expiresAt <= new Date()) {
      await prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      });
      throw new Error(
        "This invitation has expired. Ask an admin to send a new one.",
      );
    }
    if (
      !user.email ||
      user.email.toLowerCase() !== invitation.email.toLowerCase()
    ) {
      throw new Error(
        `Sign in with ${invitation.email} to accept this invitation.`,
      );
    }

    await prisma.$transaction([
      prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: user.id,
          },
        },
        update: { role: invitation.role },
        create: {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
        },
      }),
      prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: "accepted", acceptedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { accountType: "organization" },
      }),
    ]);

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/organization");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Unable to accept invitation.",
    };
  }
}

export async function saveCsrSetup(input: {
  csrBudget: number;
  csrFinancialYearStart: string;
  csrFocusCauses: string[];
  csrMatchEmployeeDonations: boolean;
  csrMatchCap?: number;
  csrPublicReport: boolean;
}) {
  try {
    const { organization } = await requireOrganizationAccess(true);

    if (!(Number.isFinite(input.csrBudget) && input.csrBudget > 0)) {
      throw new Error("Enter an annual giving budget.");
    }
    if (!input.csrFinancialYearStart) {
      throw new Error("Choose the month your financial year starts.");
    }
    if (!input.csrFocusCauses.length) {
      throw new Error("Pick at least one focus cause.");
    }
    if (
      input.csrMatchEmployeeDonations &&
      !(Number.isFinite(input.csrMatchCap) && (input.csrMatchCap ?? 0) > 0)
    ) {
      throw new Error("Set the matching cap per employee.");
    }

    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        csrBudget: input.csrBudget,
        csrFinancialYearStart: input.csrFinancialYearStart,
        csrFocusCauses: input.csrFocusCauses,
        csrMatchEmployeeDonations: input.csrMatchEmployeeDonations,
        csrMatchCap: input.csrMatchEmployeeDonations
          ? (input.csrMatchCap ?? null)
          : null,
        csrPublicReport: input.csrPublicReport,
      },
    });

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Unable to save CSR setup.",
    };
  }
}

export async function createOrganizationVerification(input: {
  registrationDocKey: string;
  directorIdKeys: string[];
}) {
  try {
    const { user, organization } = await requireOrganizationAccess(true);

    if (organization.verificationStatus === "approved") {
      throw new Error("This organisation is already verified.");
    }
    if (!input.registrationDocKey) {
      throw new Error("Upload the CAC registration document.");
    }
    if (!input.directorIdKeys.length) {
      throw new Error("Upload at least one director ID.");
    }
    for (const key of [input.registrationDocKey, ...input.directorIdKeys]) {
      if (!isOwnUploadKey(key, "organizations", user.id)) {
        throw new Error("Invalid document upload.");
      }
    }

    const latest = await prisma.organizationVerification.findFirst({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    });
    if (latest?.status === "pending") {
      throw new Error("A verification is already under review.");
    }

    await prisma.$transaction([
      prisma.organizationVerification.create({
        data: {
          organizationId: organization.id,
          registrationDocKey: input.registrationDocKey,
          directorIdKeys: input.directorIdKeys,
        },
      }),
      prisma.organization.update({
        where: { id: organization.id },
        data: { verificationStatus: "pending" },
      }),
    ]);

    revalidatePath("/organization/verification");
    revalidatePath("/onboarding");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Unable to submit verification.",
    };
  }
}

export async function getOrganizationVerification() {
  try {
    const { organization } = await requireOrganizationAccess();
    const latest = await prisma.organizationVerification.findFirst({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      select: { status: true, note: true, createdAt: true },
    });

    return {
      success: true as const,
      verificationStatus: organization.verificationStatus,
      submission: latest
        ? {
            status: latest.status,
            note: latest.note,
            submittedAt: latest.createdAt.toISOString(),
          }
        : null,
    };
  } catch (error) {
    return {
      success: false as const,
      verificationStatus: null,
      submission: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load verification status.",
    };
  }
}

export async function getOrganizationOnboardingSummary() {
  try {
    const { organization } = await requireOrganizationAccess();
    const [inviteCount, latestVerification, owner] = await Promise.all([
      prisma.organizationInvitation.count({
        where: { organizationId: organization.id },
      }),
      prisma.organizationVerification.findFirst({
        where: { organizationId: organization.id },
        orderBy: { createdAt: "desc" },
        select: { status: true, createdAt: true },
      }),
      prisma.user.findUnique({
        where: { id: organization.ownerId },
        select: { username: true },
      }),
    ]);

    return {
      success: true as const,
      summary: {
        name: organization.name,
        registrationNumber: organization.registrationNumber || "",
        purpose: organization.purpose || "both",
        csrBudget: organization.csrBudget
          ? Number(organization.csrBudget)
          : null,
        inviteCount,
        verificationStatus: organization.verificationStatus,
        verificationSubmittedAt: latestVerification
          ? latestVerification.createdAt.toISOString()
          : null,
        ownerHandle: owner?.username || "",
      },
    };
  } catch (error) {
    return {
      success: false as const,
      summary: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load organisation summary.",
    };
  }
}
