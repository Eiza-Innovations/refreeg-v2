import { uploadFileWithPresign } from "@/lib/s3/upload-client";

const DOC_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_DOC_BYTES = 10 * 1024 * 1024;

export async function uploadVerificationDocument(file: File) {
  if (!DOC_TYPES.has(file.type)) {
    return {
      success: false as const,
      error: "Documents must be a PDF, JPG, PNG, or WebP file.",
    };
  }
  if (file.size === 0 || file.size > MAX_DOC_BYTES) {
    return {
      success: false as const,
      error: "Documents must be smaller than 10 MB.",
    };
  }

  try {
    const { key } = await uploadFileWithPresign(file, {
      entityType: "organizations",
      mediaType: "documents",
    });
    return { success: true as const, key };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Upload failed.",
    };
  }
}
