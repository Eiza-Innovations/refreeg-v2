import Image from "next/image";
import MultimediaCarousel from "@/components/marketing/MultimediaCarousel";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

type Props = {
  title: string;
  cover?: string | null;
  media: string[];
};

/** Gallery carousel when there are extras, otherwise the cover image. */
export function PetitionMedia({ title, cover, media }: Props) {
  if (media.length > 0) {
    return (
      <MultimediaCarousel
        media={media}
        coverImage={cover || undefined}
        title={title}
      />
    );
  }

  const src = getMediaUrl(cover) || "/icons/placeholder.svg";
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-cream-muted">
      <Image
        src={src}
        alt={title}
        fill
        sizes="(max-width: 1024px) 100vw, 66vw"
        className="object-cover"
        priority
        unoptimized={isProxyMediaUrl(src)}
      />
    </div>
  );
}
