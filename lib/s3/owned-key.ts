import type { S3EntityType } from "@/lib/s3/s3-utils";

// Keys issued by /api/s3/presign start with uploads/{entityType}/{userId}/[entityId/]<filename>.
export function isOwnUploadKey(
  key: unknown,
  entityType: S3EntityType,
  userId: string,
  entityId?: string,
): key is string {
  if (typeof key !== "string" || !userId) return false;
  if (
    key.includes("\0") ||
    key.includes("\\") ||
    key.includes("?") ||
    key.includes("#") ||
    key.includes("%") ||
    key.includes("..")
  ) {
    return false;
  }

  const prefix = [
    "uploads",
    entityType,
    userId,
    ...(entityId ? [entityId] : []),
  ]
    .join("/")
    .concat("/");

  if (!key.startsWith(prefix) || key.length <= prefix.length) {
    return false;
  }

  const remainderSegments = key.slice(prefix.length).split("/");
  return remainderSegments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}
