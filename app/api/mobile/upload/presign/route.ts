import crypto from "crypto";
import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  generatePresignedPutUrl,
  generateS3Key,
  type S3EntityType,
  type S3MediaType,
} from "@/lib/s3/s3-utils";
import { validateUpload } from "@/lib/s3/upload-policy";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  const rateLimited = enforceRateLimit(request, {
    namespace: "mobile_upload_presign",
    limit: 30,
    windowMs: 60_000,
    identifier: user!.id,
  });
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const { entityType, fileType, fileName, entityId, fileSize } = body;

    if (
      typeof entityType !== "string" ||
      typeof fileType !== "string" ||
      typeof fileName !== "string" ||
      !entityType ||
      !fileType ||
      !fileName
    ) {
      return apiError(
        "Missing required fields (entityType, fileType, fileName)",
        400,
      );
    }

    const mediaType: S3MediaType = fileType.startsWith("video/")
      ? "videos"
      : fileType === "application/pdf"
        ? "documents"
        : "images";

    // Fallback entityId to a random UUID if not provided
    const eId =
      entityId !== undefined && entityId !== null && entityId !== ""
        ? String(entityId)
        : crypto.randomUUID();

    const sizeForCheck =
      fileSize === undefined || fileSize === null
        ? 1
        : typeof fileSize === "number" && Number.isFinite(fileSize)
          ? fileSize
          : 0;

    const policyError = validateUpload({
      entityType,
      mediaType,
      entityId: eId,
      contentType: fileType,
      size: sizeForCheck,
    });
    if (policyError) {
      return apiError(policyError, 400);
    }

    const rawExt = fileName.split(".").pop() || "";
    const fallbackExt =
      mediaType === "videos"
        ? "mp4"
        : mediaType === "documents"
          ? "pdf"
          : "jpg";
    const ext = /^[a-z0-9]{1,8}$/i.test(rawExt)
      ? rawExt.toLowerCase()
      : fallbackExt;
    const uniqueId = crypto.randomUUID();

    const s3Key = generateS3Key({
      entityType: entityType as S3EntityType,
      userId: user!.id,
      entityId: eId,
      mediaType,
      filename: `${uniqueId}.${ext}`,
    });

    const contentLength =
      typeof fileSize === "number" && Number.isFinite(fileSize) && fileSize > 0
        ? fileSize
        : undefined;

    // Generate presigned URL valid for 15 minutes using shared S3 helper (AWS_S3_BUCKET)
    const uploadUrl = await generatePresignedPutUrl(
      s3Key,
      fileType,
      900,
      contentLength,
    );

    return apiSuccess({
      uploadUrl,
      s3Key,
      entityId: eId,
    });
  } catch (error: any) {
    console.error("Mobile API Upload Presign Error:", error);
    return apiError("Internal server error", 500);
  }
}
