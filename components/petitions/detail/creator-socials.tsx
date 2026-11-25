import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import type { SocialLinks } from "@/lib/petitions/social-links";

const networks = [
  { key: "twitter", label: "Twitter", Icon: Twitter },
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
] as const;

/** Icon links to the organiser's social profiles. Renders nothing without any. */
export function CreatorSocials({ links }: { links: SocialLinks }) {
  const shown = networks.filter(({ key }) => links[key]);
  if (shown.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {shown.map(({ key, label, Icon }) => (
        <a
          key={key}
          href={links[key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 text-ink/70 transition-colors hover:border-ink hover:text-ink"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}
