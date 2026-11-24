"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { isAdminOrManager } from "./role-actions";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be signed in.");
  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }
  return session.user;
}

export async function getOrganizationVerificationQueue() {
  try {
    await requireAdmin();
    const submissions = await prisma.organizationVerification.findMany({
      where: { status: "pending" },
      include: {
        organization: {
          select: {
            name: true,
            registrationNumber: true,
            adminEmail: true,
            country: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true as const,
      submissions: submissions.map((submission) => ({
        id: submission.id,
        organizationName: submission.organization.name,
        registrationNumber: submission.organization.registrationNumber || "",
        adminEmail: submission.organization.adminEmail,
        country: submission.organization.country || "",
        registrationDocKey: submission.registrationDocKey,
        directorIdKeys: submission.directorIdKeys,
        submittedAt: submission.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return {
      success: false as const,
      submissions: [],
      error:
        error instanceof Error
          ? error.message
          : "Unable to load the verification queue.",
    };
  }
}

export async function reviewOrganizationVerification(input: {
  id: string;
  decision: "approve" | "reject";
  note?: string;
}) {
  try {
    const admin = await requireAdmin();
    const submission = await prisma.organizationVerification.findUnique({
      where: { id: input.id },
    });
    if (!submission) {
      throw new Error("Verification submission not found.");
    }
    if (submission.status !== "pending") {
      throw new Error("This submission was already reviewed.");
    }

    const status = input.decision === "approve" ? "approved" : "rejected";

    await prisma.$transaction([
      prisma.organizationVerification.update({
        where: { id: submission.id },
        data: {
          status,
          note: input.note?.trim() || null,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      }),
      prisma.organization.update({
        where: { id: submission.organizationId },
        data: { verificationStatus: status },
      }),
    ]);

    revalidatePath("/dashboard/admin/organizations/verifications");
    revalidatePath("/organization/verification");
    revalidatePath("/onboarding");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Unable to review the submission.",
    };
  }
}
