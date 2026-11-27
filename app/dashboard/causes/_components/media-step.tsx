import Image from "next/image";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { Icons } from "@/components/layout/Icons";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useObjectUrl } from "@/hooks/use-object-urls";
import {
  CAUSE_COVER_ACCEPT,
  CAUSE_COVER_DESCRIPTION,
  CAUSE_COVER_HEIGHT,
  CAUSE_COVER_WIDTH,
} from "@/lib/media/cause-cover";
import {
  MAX_VIDEO_BYTES,
  MAX_VIDEO_DURATION_SEC,
  MAX_VIDEOS_PER_CAUSE,
} from "@/lib/media/video";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import {
  MAX_GALLERY_FILES,
  MAX_TOTAL_MEDIA_BYTES,
  type CauseFormErrors,
  type CauseFormValues,
} from "@/lib/schemas/cause.schema";
import { FieldError } from "@/components/ui/field-error";

const ImageUpload = dynamic(
  () => import("@/components/ui/image-upload").then((mod) => mod.ImageUpload),
  { loading: () => <Skeleton className="h-40 w-full" /> },
);

const SelectedMediaCarousel = dynamic(
  () =>
    import("@/components/ui/premium/selected-media-carousel").then(
      (mod) => mod.SelectedMediaCarousel,
    ),
  { loading: () => <Skeleton className="h-[200px] w-full" />, ssr: false },
);

const GALLERY_ACCEPT = {
  ...CAUSE_COVER_ACCEPT,
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
};
const bytesPerMegabyte = 1024 * 1024;

type Props = {
  form: CauseFormValues;
  errors: CauseFormErrors;
  setFormFields: <K extends keyof CauseFormValues>(
    key: K,
    value: CauseFormValues[K],
  ) => void;
  onCoverUpload: (files: File[]) => void;
  onCoverRemove: () => void;
  onGalleryUpload: (files: File[]) => void;
  onGalleryRemove: (index: number) => void;
};

export function CauseMediaStep({
  form,
  errors,
  setFormFields,
  onCoverUpload,
  onCoverRemove,
  onGalleryUpload,
  onGalleryRemove,
}: Props) {
  const localCover = useObjectUrl(form.coverImage);
  const coverSrc = localCover || getMediaUrl(form.image);
  const remainingFiles = MAX_GALLERY_FILES - form.multimedia.length;
  const setLink = (index: number, value: string) =>
    setFormFields(
      "videoLinks",
      form.videoLinks.map((link, i) => (i === index ? value : link)),
    );

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section aria-labelledby="cover-label" className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Eyebrow id="cover-label">Cover photo</Eyebrow>
            {form.coverImage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCoverRemove}
                aria-label="Remove cover image"
                className="h-8 gap-1.5 px-2 text-rust hover:bg-rust/10 hover:text-rust"
              >
                <Icons.trash aria-hidden="true" className="h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
          {coverSrc && (
            <div className="relative aspect-video overflow-hidden rounded-xl bg-bone">
              <Image
                src={coverSrc}
                alt="Cover Preview"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized={
                  Boolean(form.coverImage) || isProxyMediaUrl(coverSrc)
                }
                className="object-contain"
              />
            </div>
          )}
          <ImageUpload
            onUpload={onCoverUpload}
            maxFiles={1}
            accept={CAUSE_COVER_ACCEPT}
            enableCrop
            cropAspect={16 / 9}
            cropRequired
            cropOutputWidth={CAUSE_COVER_WIDTH}
            cropOutputHeight={CAUSE_COVER_HEIGHT}
            description={`${CAUSE_COVER_DESCRIPTION} · up to ${MAX_TOTAL_MEDIA_BYTES / bytesPerMegabyte} MB`}
          />
          <FieldError message={errors.coverImage} />
        </section>

        <section aria-labelledby="gallery-label" className="min-w-0 space-y-3">
          <Eyebrow id="gallery-label">Gallery</Eyebrow>
          <P className="text-xs text-ink/70">
            Up to {MAX_GALLERY_FILES} files, including {MAX_VIDEOS_PER_CAUSE}{" "}
            videos (MP4 or WebM, {MAX_VIDEO_BYTES / bytesPerMegabyte} MB and{" "}
            {MAX_VIDEO_DURATION_SEC} seconds each).
          </P>
          {form.multimedia.length > 0 && (
            <SelectedMediaCarousel
              files={form.multimedia}
              onRemove={onGalleryRemove}
              variant="refreeg"
            />
          )}
          {remainingFiles > 0 && (
            <ImageUpload
              onUpload={onGalleryUpload}
              maxFiles={remainingFiles}
              accept={GALLERY_ACCEPT}
              enableCrop
              cropAspect={16 / 9}
              cropOutputWidth={CAUSE_COVER_WIDTH}
              cropOutputHeight={CAUSE_COVER_HEIGHT}
            />
          )}
          <FieldError message={errors.multimedia} />
        </section>
      </div>

      <Separator className="bg-hairline" />
      <section aria-labelledby="video-links-label" className="space-y-3">
        <Eyebrow id="video-links-label">Video links (optional)</Eyebrow>
        <div className="space-y-3">
          {form.videoLinks.map((link, index) => (
            <div
              key={index}
              className="group flex flex-col gap-2 animate-in slide-in-from-left-2 sm:flex-row"
            >
              <Input
                aria-label={`Video link ${index + 1}`}
                value={link}
                onChange={(e) => setLink(index, e.target.value)}
                placeholder="YouTube or Vimeo link"
                className="h-11 premium-input sm:h-12"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setFormFields(
                    "videoLinks",
                    form.videoLinks.filter((_, i) => i !== index),
                  )
                }
                className="h-11 shrink-0 rounded-xl border-rust/40 bg-surface px-5 font-semibold text-rust shadow-none hover:border-rust hover:bg-rust/10 hover:text-rust sm:h-12"
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            onClick={() =>
              setFormFields("videoLinks", [...form.videoLinks, ""])
            }
            variant="outline"
            className="h-11 w-full rounded-xl border border-dashed border-ink/20 bg-surface text-ink/70 shadow-none hover:border-forest hover:bg-bone hover:text-forest sm:h-12"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add video link
          </Button>
        </div>
      </section>
    </div>
  );
}
import { P } from "@/components/marketing/Typography";
