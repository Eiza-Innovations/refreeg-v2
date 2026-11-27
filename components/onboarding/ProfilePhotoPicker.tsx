import Image from "next/image";
import { Loader2, Upload } from "lucide-react";
import { Small, Span } from "@/components/marketing/Typography";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { cn } from "@/lib/utils";
import type { ProfilePhotoPickerProps } from "@/types/onboarding-types";

/** A round photo slot that opens the file picker. */
export function ProfilePhotoPicker({
  photoUrl,
  error,
  isUploading = false,
  onPick,
}: ProfilePhotoPickerProps) {
  const src = photoUrl
    ? getMediaUrl(photoUrl) || "/placeholder-user.jpg"
    : null;

  return (
    <div>
      <div className="flex items-center gap-4">
        <Label
          htmlFor="profile-photo"
          aria-busy={isUploading}
          className={cn(
            "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-hairline bg-cream-muted transition-colors",
            isUploading
              ? "cursor-wait opacity-75"
              : "cursor-pointer hover:border-blue-accent",
          )}
        >
          {src ? (
            <Image
              src={src}
              alt="Profile preview"
              width={80}
              height={80}
              className="h-full w-full object-cover"
              unoptimized={isProxyMediaUrl(src) || src.startsWith("blob:")}
            />
          ) : (
            <Upload className="h-7 w-7 text-ink/40" />
          )}
          {isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-cream/80">
              <Loader2
                className="h-5 w-5 animate-spin text-ink"
                aria-label="Uploading photo"
              />
            </div>
          ) : null}
        </Label>
        <div className="space-y-1">
          <Label
            htmlFor="profile-photo"
            className={cn(
              "block font-montserrat text-sm font-medium text-ink",
              isUploading ? "cursor-wait" : "cursor-pointer",
            )}
          >
            Profile photo
            <Span className="text-rust"> *</Span>
          </Label>
          <Small className="block">
            {isUploading
              ? "Uploading photo..."
              : "JPG, PNG, WebP or GIF, up to 5 MB."}
          </Small>
        </div>
      </div>
      <input
        id="profile-photo"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={isUploading}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
      <FieldError message={error} />
    </div>
  );
}
