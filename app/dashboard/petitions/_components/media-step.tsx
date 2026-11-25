import Image from "next/image";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/petitions/field-styles";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useObjectUrl } from "@/hooks/use-object-urls";
import { isProxyMediaUrl } from "@/lib/s3/media";
import { MAX_PETITION_FILES } from "@/lib/schemas/petition.schema";
import { FieldError } from "@/components/ui/field-error";
import { StepHeading } from "./step-heading";
import type { PetitionCopy } from "./petition-copy";
import type { PetitionFormApi } from "@/hooks/use-petition-form";

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

type Props = Pick<
  PetitionFormApi,
  | "form"
  | "errors"
  | "uploadCover"
  | "removeCover"
  | "uploadGallery"
  | "removeGalleryFile"
  | "setVideoLink"
  | "addVideoLink"
  | "removeVideoLink"
> & { copy: PetitionCopy };

export function PetitionMediaStep({
  form,
  errors,
  uploadCover,
  removeCover,
  uploadGallery,
  removeGalleryFile,
  setVideoLink,
  addVideoLink,
  removeVideoLink,
  copy,
}: Props) {
  const pickedCover = useObjectUrl(form.coverImage);
  const coverSrc = pickedCover || form.image;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StepHeading title="Photos and video" text={copy.mediaText} />

      <div className="space-y-6">
        <div className="space-y-4">
          <Label className="block">Cover image</Label>
          <div className="rounded-xl border border-hairline bg-surface p-6">
            <ImageUpload onUpload={uploadCover} maxFiles={1} />
            {coverSrc && (
              <div className="group relative mt-4 aspect-video overflow-hidden rounded-xl border border-hairline">
                <Image
                  src={coverSrc}
                  alt="Cover preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized={
                    Boolean(pickedCover) || isProxyMediaUrl(coverSrc)
                  }
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {form.coverImage && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeCover}
                      className="rounded-full h-10 w-10 p-0"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            <FieldError message={errors.coverImage} className="mt-2" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="block">{copy.galleryLabel}</Label>
            <span className="rounded-full border border-hairline bg-bone px-2.5 py-1 text-xs font-medium text-ink/70">
              Max {MAX_PETITION_FILES} files
            </span>
          </div>
          <div className="rounded-xl border border-hairline bg-surface p-6">
            <ImageUpload
              onUpload={uploadGallery}
              maxFiles={MAX_PETITION_FILES - form.multimedia.length}
              description={`Upload up to ${MAX_PETITION_FILES} files`}
            />
            <FieldError message={errors.multimedia} className="mt-2" />
            {form.multimedia.length > 0 && (
              <div className="mt-6">
                <SelectedMediaCarousel
                  files={form.multimedia}
                  onRemove={removeGalleryFile}
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="block">{copy.linksLabel}</Label>
          <div className="space-y-3">
            {form.videoLinks.map((link, index) => (
              <div
                key={index}
                className="flex gap-2 group animate-in slide-in-from-left-2"
              >
                <Input
                  value={link}
                  onChange={(e) => setVideoLink(index, e.target.value)}
                  placeholder={copy.linkPlaceholder}
                  className={cn(fieldClass, "h-12")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeVideoLink(index)}
                  className="h-12 rounded-lg text-rust hover:bg-rust/10 hover:text-rust"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={addVideoLink}
              variant="outline"
              className="h-12 w-full rounded-xl border-2 border-dashed border-ink/20 bg-transparent text-ink/60 hover:border-ink hover:bg-bone hover:text-ink"
            >
              {copy.addLink}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
