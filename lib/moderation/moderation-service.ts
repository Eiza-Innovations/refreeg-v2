import { revalidateTag } from "next/cache";
import { invalidateMobileCachePrefix } from "@/lib/api/mobile-cache";
import { DISCOVER_CACHE_TAG } from "@/lib/causes/discover-constants";
import { DATA_RETENTION_POLICY } from "@/lib/config/retention";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/uuid";

export type ReportTargetType = "comment" | "cause" | "petition" | "user";
export type ReportStatus = "pending" | "actioned" | "dismissed";
export type ModerationAction = "dismiss" | "remove_content" | "block_user";

export const VALID_MODERATION_ACTIONS: readonly ModerationAction[] = [
  "dismiss",
  "remove_content",
  "block_user",
];

export class ModerationValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ModerationValidationError";
    this.statusCode = statusCode;
  }
}

export interface ModerationReportItem {
  id: string;
  reporterId: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  targetType: ReportTargetType;
  targetId: string;
  targetPreview: string | null;
  reportedUserId: string | null;
  reportedUserName: string | null;
  reportedUserEmail: string | null;
  reportedUserBlocked: boolean;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolutionNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  dueAt: string;
  createdAt: string;
  isOverdue: boolean;
  hoursRemaining: number;
}

/**
 * Verifies the reported target exists in the database and derives its true
 * owning user ID server-side so callers cannot frame an unrelated account.
 */
async function resolveReportedUserIdFromTarget(
  targetType: ReportTargetType,
  targetId: string,
  explicitReportedUserId?: string | null,
): Promise<string | null> {
  if (!isUuid(targetId)) {
    throw new ModerationValidationError("Invalid targetId format", 400);
  }

  const trimmedExplicit = isUuid(explicitReportedUserId)
    ? explicitReportedUserId.trim()
    : null;

  if (targetType === "user") {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!targetUser) {
      throw new ModerationValidationError("Reported user not found", 404);
    }
    if (trimmedExplicit && trimmedExplicit !== targetUser.id) {
      throw new ModerationValidationError(
        "reportedUserId does not match target user",
        400,
      );
    }
    return targetUser.id;
  }

  if (targetType === "comment") {
    const comment = await prisma.comments.findUnique({
      where: { id: targetId },
      select: { user_id: true },
    });
    if (!comment) {
      throw new ModerationValidationError("Comment not found", 404);
    }
    if (trimmedExplicit && comment.user_id !== trimmedExplicit) {
      throw new ModerationValidationError(
        "reportedUserId does not match comment author",
        400,
      );
    }
    return comment.user_id ?? null;
  }

  if (targetType === "cause") {
    const cause = await prisma.cause.findUnique({
      where: { id: targetId },
      select: { userId: true },
    });
    if (!cause) {
      throw new ModerationValidationError("Cause not found", 404);
    }
    if (trimmedExplicit && cause.userId !== trimmedExplicit) {
      throw new ModerationValidationError(
        "reportedUserId does not match cause creator",
        400,
      );
    }
    return cause.userId ?? null;
  }

  if (targetType === "petition") {
    const petition = await prisma.petitions.findUnique({
      where: { id: targetId },
      select: { user_id: true },
    });
    if (!petition) {
      throw new ModerationValidationError("Petition not found", 404);
    }
    if (trimmedExplicit && petition.user_id !== trimmedExplicit) {
      throw new ModerationValidationError(
        "reportedUserId does not match petition creator",
        400,
      );
    }
    return petition.user_id ?? null;
  }

  throw new ModerationValidationError("Invalid targetType", 400);
}

async function createOrReusePendingReport(input: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reportedUserId: string | null;
  reason: string;
  details?: string | null;
}): Promise<{ id: string; dueAt: Date; slaHours: number }> {
  const slaHours = DATA_RETENTION_POLICY.MODERATION_SLA_HOURS;

  const existing = await prisma.content_reports.findFirst({
    where: {
      reporter_id: input.reporterId,
      target_type: input.targetType,
      target_id: input.targetId.slice(0, 128),
      status: "pending",
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      due_at: true,
    },
  });

  if (existing) {
    return {
      id: existing.id,
      dueAt: existing.due_at,
      slaHours,
    };
  }

  const dueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);
  const created = await prisma.content_reports.create({
    data: {
      reporter_id: input.reporterId,
      target_type: input.targetType,
      target_id: input.targetId.slice(0, 128),
      reported_user_id: input.reportedUserId,
      reason: input.reason.slice(0, 255),
      details: input.details ?? null,
      status: "pending",
      due_at: dueAt,
    },
    select: {
      id: true,
      due_at: true,
    },
  });

  return {
    id: created.id,
    dueAt: created.due_at,
    slaHours,
  };
}

export async function createContentReport(input: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reportedUserId?: string | null;
  reason: string;
  details?: string | null;
}): Promise<{ id: string; dueAt: Date; slaHours: number }> {
  if (!isUuid(input.reporterId)) {
    throw new ModerationValidationError(
      "Authenticated reporter is required",
      401,
    );
  }

  const resolvedReportedUserUuid = await resolveReportedUserIdFromTarget(
    input.targetType,
    input.targetId,
    input.reportedUserId,
  );

  return createOrReusePendingReport({
    reporterId: input.reporterId.trim(),
    targetType: input.targetType,
    targetId: input.targetId,
    reportedUserId: resolvedReportedUserUuid,
    reason: input.reason,
    details: input.details,
  });
}

export async function blockUserForModeration(input: {
  blockerUserId: string;
  blockedUserId?: string | null;
  commentId?: string | null;
  reason?: string | null;
}): Promise<{ blockedUserId: string; reportId: string }> {
  if (!isUuid(input.blockerUserId)) {
    throw new ModerationValidationError("Valid blocker user is required", 401);
  }

  let targetUserId: string;

  if (input.commentId) {
    if (!isUuid(input.commentId)) {
      throw new ModerationValidationError("Invalid commentId format", 400);
    }
    const comment = await prisma.comments.findUnique({
      where: { id: input.commentId.trim() },
      select: { user_id: true },
    });
    if (!comment) {
      throw new ModerationValidationError("Comment not found", 404);
    }
    if (!comment.user_id) {
      throw new ModerationValidationError(
        "Comment author cannot be resolved",
        404,
      );
    }
    if (input.blockedUserId && input.blockedUserId.trim() !== comment.user_id) {
      throw new ModerationValidationError(
        "blockedUserId does not match comment author",
        400,
      );
    }
    targetUserId = comment.user_id;
  } else {
    if (!isUuid(input.blockedUserId)) {
      throw new ModerationValidationError(
        "Valid blockedUserId is required",
        400,
      );
    }
    const targetUser = await prisma.user.findUnique({
      where: { id: input.blockedUserId.trim() },
      select: { id: true },
    });
    if (!targetUser) {
      throw new ModerationValidationError("Target user not found", 404);
    }
    targetUserId = targetUser.id;
  }

  if (targetUserId === input.blockerUserId) {
    throw new ModerationValidationError("You cannot block yourself.", 400);
  }

  await prisma.user_blocks.upsert({
    where: {
      blocker_user_id_blocked_user_id: {
        blocker_user_id: input.blockerUserId,
        blocked_user_id: targetUserId,
      },
    },
    create: {
      blocker_user_id: input.blockerUserId,
      blocked_user_id: targetUserId,
      reason: (input.reason ?? "Blocked by user in mobile app").slice(0, 255),
    },
    update: {},
  });

  // Auto-escalate to moderators within the 48-hour SLA (deduplicated per open target).
  const report = await createOrReusePendingReport({
    reporterId: input.blockerUserId,
    targetType: input.commentId ? "comment" : "user",
    targetId: input.commentId?.trim() || targetUserId,
    reportedUserId: targetUserId,
    reason:
      input.reason || "User blocked author for abusive/objectionable content",
    details:
      "Auto-escalated to moderation queue when user blocked this account.",
  });

  return {
    blockedUserId: targetUserId,
    reportId: report.id,
  };
}

export async function unblockUserForModeration(input: {
  blockerUserId: string;
  blockedUserId: string;
}): Promise<void> {
  if (!isUuid(input.blockerUserId) || !isUuid(input.blockedUserId)) {
    return;
  }

  await prisma.user_blocks.deleteMany({
    where: {
      blocker_user_id: input.blockerUserId,
      blocked_user_id: input.blockedUserId,
    },
  });
}

export async function getBlockedUserIds(
  blockerUserId: string | null | undefined,
): Promise<string[]> {
  if (!isUuid(blockerUserId)) return [];

  try {
    const rows = await prisma.user_blocks.findMany({
      where: { blocker_user_id: blockerUserId },
      select: { blocked_user_id: true },
    });
    return rows.map((r) => r.blocked_user_id);
  } catch {
    return [];
  }
}

export async function listModerationReports(options?: {
  status?: string;
}): Promise<{
  reports: ModerationReportItem[];
  counts: {
    pending: number;
    actioned: number;
    dismissed: number;
    overdue: number;
  };
}> {
  const statusFilter =
    options?.status &&
    ["pending", "actioned", "dismissed"].includes(options.status)
      ? options.status
      : null;

  const rawReports = statusFilter
    ? await prisma.content_reports.findMany({
        where: { status: statusFilter },
        orderBy: [{ due_at: "asc" }, { created_at: "desc" }],
        take: 200,
      })
    : await Promise.all([
        prisma.content_reports.findMany({
          where: { status: "pending" },
          orderBy: [{ due_at: "asc" }, { created_at: "desc" }],
          take: 200,
        }),
        prisma.content_reports.findMany({
          where: { status: { not: "pending" } },
          orderBy: [{ due_at: "asc" }, { created_at: "desc" }],
          take: 200,
        }),
      ]).then(([pendingRows, resolvedRows]) =>
        [...pendingRows, ...resolvedRows].slice(0, 200),
      );

  const userIds = Array.from(
    new Set(
      rawReports
        .flatMap((r) => [r.reporter_id, r.reported_user_id])
        .filter((id): id is string => isUuid(id)),
    ),
  );

  const commentIds = rawReports
    .filter((r) => r.target_type === "comment" && isUuid(r.target_id))
    .map((r) => r.target_id);
  const causeIds = rawReports
    .filter((r) => r.target_type === "cause" && isUuid(r.target_id))
    .map((r) => r.target_id);
  const petitionIds = rawReports
    .filter((r) => r.target_type === "petition" && isUuid(r.target_id))
    .map((r) => r.target_id);

  const now = new Date();
  const [
    users,
    comments,
    causes,
    petitions,
    pending,
    actioned,
    dismissed,
    overdue,
  ] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            fullName: true,
            email: true,
            isBlocked: true,
          },
        })
      : Promise.resolve([]),
    commentIds.length > 0
      ? prisma.comments.findMany({
          where: { id: { in: commentIds } },
          select: { id: true, content: true },
        })
      : Promise.resolve([]),
    causeIds.length > 0
      ? prisma.cause.findMany({
          where: { id: { in: causeIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
    petitionIds.length > 0
      ? prisma.petitions.findMany({
          where: { id: { in: petitionIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
    prisma.content_reports.count({ where: { status: "pending" } }),
    prisma.content_reports.count({ where: { status: "actioned" } }),
    prisma.content_reports.count({ where: { status: "dismissed" } }),
    prisma.content_reports.count({
      where: { status: "pending", due_at: { lt: now } },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const previewMap = new Map<string, string>();
  for (const c of comments) previewMap.set(`comment:${c.id}`, c.content);
  for (const c of causes) previewMap.set(`cause:${c.id}`, c.title);
  for (const p of petitions) previewMap.set(`petition:${p.id}`, p.title);

  const nowMs = now.getTime();
  const reports: ModerationReportItem[] = rawReports.map((r) => {
    const reporter = r.reporter_id ? userMap.get(r.reporter_id) : undefined;
    const reported = r.reported_user_id
      ? userMap.get(r.reported_user_id)
      : undefined;
    const dueMs = r.due_at.getTime();
    const hoursRemaining =
      Math.round(((dueMs - nowMs) / (1000 * 60 * 60)) * 10) / 10;
    const isOverdue = r.status === "pending" && dueMs < nowMs;

    return {
      id: r.id,
      reporterId: r.reporter_id,
      reporterName: reporter?.fullName ?? null,
      reporterEmail: reporter?.email ?? null,
      targetType: (r.target_type as ReportTargetType) || "comment",
      targetId: r.target_id,
      targetPreview: previewMap.get(`${r.target_type}:${r.target_id}`) ?? null,
      reportedUserId: r.reported_user_id,
      reportedUserName: reported?.fullName ?? null,
      reportedUserEmail: reported?.email ?? null,
      reportedUserBlocked: Boolean(reported?.isBlocked),
      reason: r.reason,
      details: r.details,
      status: (r.status as ReportStatus) || "pending",
      resolutionNote: r.resolution_note,
      reviewedBy: r.reviewed_by,
      reviewedAt: r.reviewed_at ? r.reviewed_at.toISOString() : null,
      dueAt: r.due_at.toISOString(),
      createdAt: r.created_at.toISOString(),
      isOverdue,
      hoursRemaining,
    };
  });

  return {
    reports,
    counts: {
      pending,
      actioned,
      dismissed,
      overdue,
    },
  };
}

export async function resolveModerationReport(input: {
  reportId: string;
  adminId: string;
  action: ModerationAction;
  resolutionNote?: string;
}): Promise<{ success: boolean; message: string }> {
  if (!isUuid(input.reportId) || !isUuid(input.adminId)) {
    return { success: false, message: "Invalid report or moderator ID." };
  }

  if (!VALID_MODERATION_ACTIONS.includes(input.action)) {
    return { success: false, message: "Invalid moderation action." };
  }

  const outcome = await prisma.$transaction(async (tx) => {
    const report = await tx.content_reports.findUnique({
      where: { id: input.reportId },
      select: {
        id: true,
        status: true,
        target_type: true,
        target_id: true,
        reported_user_id: true,
      },
    });

    if (!report) {
      return { success: false, message: "Report not found." } as const;
    }

    if (report.status !== "pending") {
      return {
        success: false,
        message: "This report has already been resolved.",
      } as const;
    }

    if (input.action === "remove_content" && report.target_type === "user") {
      return {
        success: false,
        message:
          "Cannot remove content on a user-only report; use dismiss or block_user.",
      } as const;
    }

    if (input.action === "block_user") {
      if (!isUuid(report.reported_user_id)) {
        return {
          success: false,
          message: "No user account is linked to this report.",
        } as const;
      }
      if (report.reported_user_id === input.adminId) {
        return {
          success: false,
          message: "You cannot block your own account.",
        } as const;
      }

      const privilegedRole = await tx.role.findFirst({
        where: {
          user_id: report.reported_user_id,
          role: { in: ["admin", "manager"] },
        },
        select: { role: true },
      });
      if (privilegedRole) {
        return {
          success: false,
          message:
            "Admin and manager accounts cannot be blocked from the moderation queue.",
        } as const;
      }
    }

    const nextStatus: ReportStatus =
      input.action === "dismiss" ? "dismissed" : "actioned";
    const defaultNote =
      input.action === "dismiss"
        ? "Reviewed and dismissed by moderator."
        : input.action === "block_user"
          ? report.target_type === "user"
            ? "User account blocked."
            : "Offending content removed and user account blocked."
          : "Offending content removed by moderator.";

    const claimed = await tx.content_reports.updateMany({
      where: {
        id: input.reportId,
        status: "pending",
      },
      data: {
        status: nextStatus,
        resolution_note: input.resolutionNote || defaultNote,
        reviewed_by: input.adminId,
        reviewed_at: new Date(),
        updated_at: new Date(),
      },
    });

    if (claimed.count !== 1) {
      return {
        success: false,
        message: "This report has already been resolved.",
      } as const;
    }

    let invalidatedPrefix: "causes:" | "petitions:" | null = null;

    if (input.action === "remove_content" || input.action === "block_user") {
      if (report.target_type === "comment" && isUuid(report.target_id)) {
        await tx.comments.deleteMany({
          where: {
            OR: [{ id: report.target_id }, { parent_id: report.target_id }],
          },
        });
        invalidatedPrefix = "causes:";
      } else if (report.target_type === "cause" && isUuid(report.target_id)) {
        await tx.cause.updateMany({
          where: { id: report.target_id },
          data: {
            paused: true,
            status: "rejected",
            rejectionReason:
              input.resolutionNote || "Removed following moderation review.",
          },
        });
        invalidatedPrefix = "causes:";
      } else if (
        report.target_type === "petition" &&
        isUuid(report.target_id)
      ) {
        await tx.petitions.updateMany({
          where: { id: report.target_id },
          data: {
            status: "rejected",
            rejection_reason:
              input.resolutionNote || "Removed following moderation review.",
          },
        });
        invalidatedPrefix = "petitions:";
      }
    }

    if (input.action === "block_user" && isUuid(report.reported_user_id)) {
      await tx.user.updateMany({
        where: { id: report.reported_user_id },
        data: {
          isBlocked: true,
          sessions_invalidated_after: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    await tx.logs.create({
      data: {
        action:
          input.action === "block_user"
            ? "block-user"
            : `moderation-${input.action}`,
        admin_id: input.adminId,
      },
    });

    return {
      success: true,
      message: defaultNote,
      invalidatedPrefix,
    } as const;
  });

  if (!outcome.success) {
    return { success: false, message: outcome.message };
  }

  if (outcome.invalidatedPrefix) {
    invalidateMobileCachePrefix(outcome.invalidatedPrefix);
  }
  try {
    revalidateTag(DISCOVER_CACHE_TAG);
  } catch {
    // No Next.js request cache active in standalone scripts/tests
  }

  return {
    success: true,
    message: outcome.message,
  };
}
