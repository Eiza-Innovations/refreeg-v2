import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
import { isUuid } from "@/lib/uuid";
import { s3Client } from "./s3-client";

export const getBucketName = () => {
  const bucketName = process.env.AWS_S3_BUCKET;
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET environment variable is not set");
  }
  return bucketName;
};

export type S3EntityType =
  | "profiles"
  | "causes"
  | "petitions"
  | "kyc"
  | "organizations"
  | "wishlist-items";
export type S3MediaType = "images" | "videos" | "documents";

const OWNED_ENTITY_TYPES: readonly S3EntityType[] = [
  "profiles",
  "kyc",
  "causes",
  "petitions",
  "organizations",
  "wishlist-items",
];

const ALLOWED_USER_PREFIX_RE =
  /^uploads\/(profiles|kyc|causes|petitions|organizations)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i;

export function generateS3Key(params: {
  entityType: S3EntityType;
  userId: string;
  entityId?: string;
  mediaType: S3MediaType;
  filename: string;
}) {
  const { entityType, userId, entityId, mediaType, filename } = params;

  const parts = ["uploads", entityType, userId];

  if (entityId) {
    parts.push(entityId);
  }

  parts.push(mediaType, filename);

  return parts.join("/");
}

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string,
) {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  return s3Client.send(command);
}

export async function generatePresignedGetUrl(key: string, expiresIn = 3600) {
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }

  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function generatePresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn = 900,
  contentLength?: number,
) {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
    // Signed into the URL so S3 rejects bodies of a different size.
    ...(contentLength ? { ContentLength: contentLength } : {}),
  });

  return getSignedUrl(s3Client, command, {
    expiresIn,
    ...(contentLength ? { signableHeaders: new Set(["content-length"]) } : {}),
  });
}

function hasUnsafeKeySegments(key?: string): boolean {
  if (!key || key.includes("\0") || key.includes("\\")) return true;
  return key.split("/").some((segment) => segment === "." || segment === "..");
}

function isAllowedUploadHost(hostname: string, bucket?: string): boolean {
  const lower = hostname.toLowerCase();
  const cfDomain = process.env.AWS_CLOUDFRONT_DOMAIN?.trim().toLowerCase();
  if (cfDomain && lower === cfDomain) {
    return true;
  }
  if (!cfDomain && lower.endsWith(".cloudfront.net")) {
    return true;
  }
  if (!bucket) return false;

  const escapedBucket = bucket
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const virtualHostedRe = new RegExp(
    `^${escapedBucket}\\.s3(?:[.-][a-z0-9-]+)?\\.amazonaws\\.com$`,
  );
  const pathStyleRe = /^s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/;
  return virtualHostedRe.test(lower) || pathStyleRe.test(lower);
}

/**
 * Normalizes a stored media reference into a bucket-relative S3 key if it belongs
 * to RefreeG's configured S3/CloudFront uploads path, rejecting traversal segments
 * and third-party URLs (e.g. Google avatars or attacker-controlled origins).
 */
export function extractS3Key(
  rawUrlOrKey: string | null | undefined,
): string | null {
  if (!rawUrlOrKey) return null;
  const trimmed = rawUrlOrKey.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("uploads/")) {
    const clean = trimmed.split("?")[0];
    return clean.length > "uploads/".length && !hasUnsafeKeySegments(clean)
      ? clean
      : null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      const bucket = process.env.AWS_S3_BUCKET?.trim();
      if (!isAllowedUploadHost(parsed.hostname, bucket)) {
        return null;
      }

      let pathWithoutLeadingSlash = decodeURIComponent(
        parsed.pathname.replace(/^\/+/, ""),
      );
      if (
        bucket &&
        /^s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i.test(parsed.hostname)
      ) {
        const bucketPrefix = `${bucket}/`;
        if (!pathWithoutLeadingSlash.startsWith(bucketPrefix)) {
          return null;
        }
        pathWithoutLeadingSlash = pathWithoutLeadingSlash.slice(
          bucketPrefix.length,
        );
      }

      if (
        pathWithoutLeadingSlash.startsWith("uploads/") &&
        pathWithoutLeadingSlash.length > "uploads/".length &&
        !hasUnsafeKeySegments(pathWithoutLeadingSlash)
      ) {
        return pathWithoutLeadingSlash;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function deleteS3Object(key: string): Promise<void> {
  const normalizedKey = extractS3Key(key);
  if (!normalizedKey || !process.env.AWS_S3_BUCKET) return;

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: normalizedKey,
    }),
  );
}

export async function deleteS3Prefix(prefix: string): Promise<number> {
  if (
    !process.env.AWS_S3_BUCKET ||
    hasUnsafeKeySegments(prefix) ||
    !ALLOWED_USER_PREFIX_RE.test(prefix)
  ) {
    return 0;
  }

  const bucket = getBucketName();
  let continuationToken: string | undefined;
  let deletedCount = 0;

  do {
    const listed = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const objects =
      listed.Contents?.map((item) => item.Key)
        .filter(
          (key): key is string => Boolean(key) && !hasUnsafeKeySegments(key),
        )
        .map((Key) => ({ Key })) ?? [];

    if (objects.length > 0) {
      const result = await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objects, Quiet: false },
        }),
      );
      if (result?.Errors?.length) {
        console.error(
          `[deleteS3Prefix] Partial delete errors under ${prefix}:`,
          result.Errors,
        );
      }
      deletedCount += objects.length - (result?.Errors?.length ?? 0);
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return deletedCount;
}

/**
 * Deletes all personal S3 objects strictly owned by `userId` (profile photos,
 * KYC documents, and any verified user-owned extra keys). Failures are logged
 * without interrupting post-deletion cleanup.
 */
export async function deleteUserPersonalS3Files(
  userId: string,
  extraKeys: (string | null | undefined)[] = [],
): Promise<void> {
  if (!process.env.AWS_S3_BUCKET || !isUuid(userId)) return;

  const prefixes = [`uploads/profiles/${userId}/`, `uploads/kyc/${userId}/`];

  const ownedExtraKeys = Array.from(
    new Set(
      extraKeys
        .map((key) => extractS3Key(key))
        .filter(
          (key): key is string =>
            Boolean(key) &&
            OWNED_ENTITY_TYPES.some((entityType) =>
              isOwnUploadKey(key, entityType, userId),
            ),
        ),
    ),
  );

  const results = await Promise.allSettled([
    ...prefixes.map((prefix) => deleteS3Prefix(prefix)),
    ...ownedExtraKeys.map((key) => deleteS3Object(key)),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        `[deleteUserPersonalS3Files] S3 cleanup failed for user ${userId}:`,
        result.reason,
      );
    }
  }
}
