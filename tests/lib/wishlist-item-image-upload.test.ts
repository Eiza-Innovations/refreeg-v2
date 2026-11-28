jest.mock("@/lib/s3/upload-client", () => ({
  uploadFileWithPresign: jest.fn(),
}));

import { uploadFileWithPresign } from "@/lib/s3/upload-client";
import { uploadWishlistItemImage } from "@/lib/wishlist/item-image-upload";

const image = (type = "image/jpeg", size = 1024) =>
  new File([new Uint8Array(size)], "desk", { type });

describe("uploadWishlistItemImage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects non-image files without uploading", async () => {
    const result = await uploadWishlistItemImage(image("application/pdf"));
    expect(result).toEqual({
      success: false,
      error: "Use a JPG, PNG, WebP or GIF image",
    });
    expect(uploadFileWithPresign).not.toHaveBeenCalled();
  });

  it("rejects empty and oversized files", async () => {
    const empty = await uploadWishlistItemImage(image("image/png", 0));
    const big = await uploadWishlistItemImage(
      image("image/png", 10 * 1024 * 1024 + 1),
    );
    expect(empty.success).toBe(false);
    expect(big).toEqual({ success: false, error: "Images stay under 10MB" });
    expect(uploadFileWithPresign).not.toHaveBeenCalled();
  });

  it("returns the key and forwards the item id", async () => {
    (uploadFileWithPresign as jest.Mock).mockResolvedValue({ key: "k.jpg" });
    const result = await uploadWishlistItemImage(image(), "item-1");
    expect(result).toEqual({ success: true, key: "k.jpg" });
    expect(uploadFileWithPresign).toHaveBeenCalledWith(expect.any(File), {
      entityType: "wishlist-items",
      mediaType: "images",
      entityId: "item-1",
    });
  });

  it("turns an upload failure into an error result", async () => {
    (uploadFileWithPresign as jest.Mock).mockRejectedValue(new Error("boom"));
    expect(await uploadWishlistItemImage(image())).toEqual({
      success: false,
      error: "boom",
    });
  });
});
