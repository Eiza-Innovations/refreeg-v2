import Image from "next/image";
import { Upload } from "lucide-react";
import { FieldError } from "@/components/ui/field-error";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import type { ProfilePhotoPickerProps } from "@/types/onboarding-types";

/** A round photo slot that opens the file picker. */
export function ProfilePhotoPicker({
  photoUrl,
  error,
  onPick,
}: ProfilePhotoPickerProps) {
  const src = photoUrl
    ? getMediaUrl(photoUrl) || "/placeholder-user.jpg"
    : null;

  return (
    <div>
      <label
        htmlFor="profile-photo"
        className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-hairline bg-cream-muted transition-colors hover:border-blue-accent"
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
      </label>
      <input
        id="profile-photo"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
        }}
      />
      <FieldError message={error} />
    </div>
  );
}
