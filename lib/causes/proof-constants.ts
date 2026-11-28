export const MAX_PROOF_FILES = 10;
export const MAX_PROOF_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PROOF_DOC_BYTES = 20 * 1024 * 1024;
export const MAX_PROOF_VIDEO_BYTES = 100 * 1024 * 1024;

export function mediaKind(mime: string): "image" | "video" | "document" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "document";
  return null;
}
