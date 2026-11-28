"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "./role-actions";
import { createNotification } from "@/lib/notifications/notification-service";
import { bountyChangeRequestSchema } from "@/lib/schemas/bounty.schema";
import type { Bounty, BountyStatus } from "@/types/bounty-types";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!(await isAdminOrManager(session.user.id))) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }
  return session.user.id;
}

const include = {
  cause: { select: { title: true } },
  owner: { select: { fullName: true } },
} as const;

function toBounty(row: {
  id: string;
  title: string;
  category: string;
  description: string;
  deliverable: string;
  reward: unknown;
  available_spots: number;
  deadline: Date;
  submitted_at: Date | null;
  created_at: Date;
  status: string;
  changes_requested: string | null;
  cause: { title: string };
  owner: { fullName: string | null };
}): Bounty {
  return {
    id: row.id,
    title: row.title,
    campaign: row.cause.title,
    category: row.category,
    description: row.description,
    deliverable: row.deliverable,
    reward: Number(row.reward),
    availableSpots: row.available_spots,
    deadline: row.deadline.toISOString().slice(0, 10),
    submittedAt: (row.submitted_at ?? row.created_at).toISOString(),
    owner: row.owner.fullName ?? "Unknown",
    status: row.status as BountyStatus,
    submissions: 0,
    changesRequested: row.changes_requested ?? undefined,
  };
}

export async function listAdminBounties(): Promise<Bounty[]> {
  await requireAdmin();
  const rows = await prisma.bounties.findMany({
    where: { status: { not: "draft" } },
    include,
    orderBy: { created_at: "desc" },
  });
  return rows.map(toBounty);
}

export async function getAdminBounty(id: string): Promise<Bounty | null> {
  await requireAdmin();
  const row = await prisma.bounties.findUnique({ where: { id }, include });
  return row ? toBounty(row) : null;
}

export async function decideBounty(input: {
  bountyId: string;
  decision: "approve" | "request_changes";
  feedback?: string;
}) {
  await requireAdmin();

  const status = input.decision === "approve" ? "live" : "changes-requested";
  const changesRequested =
    input.decision === "request_changes"
      ? bountyChangeRequestSchema.parse({ feedback: input.feedback }).feedback
      : null;

  const bounty = await prisma.bounties.update({
    where: { id: input.bountyId },
    data: {
      status,
      changes_requested: changesRequested,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
    select: { title: true, owner_id: true },
  });

  await createNotification({
    userId: bounty.owner_id,
    title:
      status === "live"
        ? "Bounty approved"
        : "Changes requested on your bounty",
    message:
      status === "live"
        ? `"${bounty.title}" is now live and open for applications.`
        : `"${bounty.title}": ${changesRequested}`,
    type: "bounty_reviewed",
    data: { bountyId: input.bountyId, status },
  });

  revalidatePath("/dashboard/admin/bounties");
  revalidatePath(`/dashboard/admin/bounties/${input.bountyId}`);
  return { success: true };
}
