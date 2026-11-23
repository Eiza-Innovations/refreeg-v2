import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { isUuid } from "@/lib/uuid";
import {
  createContentReport,
  ModerationValidationError,
  type ReportTargetType,
} from "@/lib/moderation/moderation-service";

const VALID_TARGET_TYPES: ReportTargetType[] = [
  "comment",
  "cause",
  "petition",
  "user",
];

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateMobileRequest(request);
    if (authResult.errorResponse || !authResult.user) {
      return authResult.errorResponse!;
    }
    const reporter = authResult.user;

    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_reports_create",
      limit: 15,
      windowMs: 60_000,
      identifier: reporter.id,
    });
    if (rateLimited) return rateLimited;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return apiError("Invalid JSON request body", 400);
    }

    const rawType =
      body.targetType !== undefined && body.targetType !== null
        ? String(body.targetType).trim().toLowerCase()
        : "comment";
    if (!VALID_TARGET_TYPES.includes(rawType as ReportTargetType)) {
      return apiError("Invalid targetType", 400);
    }
    const targetType = rawType as ReportTargetType;

    if (typeof body.targetId !== "string" || !isUuid(body.targetId.trim())) {
      return apiError("Valid targetId is required", 400);
    }
    const targetId = body.targetId.trim();

    if (typeof body.reason !== "string" || !body.reason.trim()) {
      return apiError("reason is required", 400);
    }
    const reason = body.reason.trim();
    if (reason.length > 255) {
      return apiError("reason exceeds maximum length of 255 characters", 400);
    }

    let details: string | null = null;
    if (body.details !== undefined && body.details !== null) {
      if (typeof body.details !== "string") {
        return apiError("details must be a string", 400);
      }
      const trimmedDetails = body.details.trim();
      if (trimmedDetails.length > 2000) {
        return apiError(
          "details exceeds maximum length of 2000 characters",
          400,
        );
      }
      details = trimmedDetails || null;
    }

    let reportedUserId: string | null = null;
    if (body.reportedUserId !== undefined && body.reportedUserId !== null) {
      if (
        typeof body.reportedUserId !== "string" ||
        !isUuid(body.reportedUserId.trim())
      ) {
        return apiError("Invalid reportedUserId format", 400);
      }
      reportedUserId = body.reportedUserId.trim();
    }

    const report = await createContentReport({
      reporterId: reporter.id,
      targetType,
      targetId,
      reportedUserId,
      reason,
      details,
    });

    return apiSuccess(
      {
        reportId: report.id,
        dueAt: report.dueAt.toISOString(),
        slaHours: report.slaHours,
        message: `Report submitted. A moderator will review this within ${report.slaHours} hours.`,
      },
      201,
    );
  } catch (error) {
    if (error instanceof ModerationValidationError) {
      return apiError(error.message, error.statusCode);
    }
    console.error("[POST /api/mobile/reports] Error:", error);
    return apiError("Unable to submit report right now.", 500);
  }
}
