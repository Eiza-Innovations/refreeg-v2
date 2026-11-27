import { uploadFileWithPresign } from "@/lib/s3/upload-client";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const WISHLIST_IMAGE_ACCEPT = IMAGE_TYPES.join(",");

export async function uploadWishlistItemImage(file: File, entityId?: string) {
  if (!IMAGE_TYPES.includes(file.type)) {
    return {
      success: false as const,
      error: "Use a JPG, PNG, WebP or GIF image",
    };
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return { success: false as const, error: "Images stay under 10MB" };
  }

  try {
    const { key } = await uploadFileWithPresign(file, {
      entityType: "wishlist-items",
      mediaType: "images",
      entityId,
    });
    return { success: true as const, key };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Upload failed. Please try again.",
    };
  }
}
