import Link from "next/link";
import { Flag } from "lucide-react";
import { Heading, Small } from "@/components/marketing/Typography";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CreatorSocials } from "./creator-socials";
import type { SocialLinks } from "@/lib/petitions/social-links";

type Props = {
  title: string;
  category: string;
  createdAt: string;
  creatorName?: string;
  creatorHref: string;
  status: string;
  socials: SocialLinks;
};

const notices: Record<string, string> = {
  pending: "Under review",
  rejected: "Not accepting signatures",
  expired: "Closed",
};

/** Eyebrow, title and organiser line at the top of a petition. */
export function PetitionHeader({
  title,
  category,
  createdAt,
  creatorName,
  creatorHref,
  status,
  socials,
}: Props) {
  const started = new Date(createdAt).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Eyebrow className="inline-flex items-center gap-1.5 text-amber">
          <Flag className="h-3.5 w-3.5" />
          Petition
        </Eyebrow>
        <Eyebrow>{category}</Eyebrow>
        {notices[status] && <Badge variant="pending">{notices[status]}</Badge>}
      </div>
      <Heading as="h1" size="subsection" className="md:text-5xl">
        {title}
      </Heading>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Small className="text-ink/70">
          {creatorName && (
            <>
              Started by{" "}
              <Link
                href={creatorHref}
                className="font-semibold text-ink underline-offset-2 hover:underline"
              >
                {creatorName}
              </Link>{" "}
              on{" "}
            </>
          )}
          {started}
        </Small>
        <CreatorSocials links={socials} />
      </div>
    </header>
  );
}
