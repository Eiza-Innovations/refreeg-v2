import { Heading, P, Small } from "@/components/marketing/Typography";

type Props = {
  description?: string | null;
  sections?: { heading: string; description: string }[];
  videoLinks: string[];
};

/** The petition's written case: intro, sections, video links. */
export function PetitionStory({ description, sections, videoLinks }: Props) {
  return (
    <div className="space-y-8">
      {description && (
        <P className="whitespace-pre-line text-lg leading-8 text-ink/80">
          {description}
        </P>
      )}

      {sections?.map((section, index) => (
        <section key={index} className="space-y-2">
          <Heading as="h3" size="subsection" className="text-2xl md:text-2xl">
            {section.heading}
          </Heading>
          <P className="whitespace-pre-line leading-7 text-ink/70">
            {section.description}
          </P>
        </section>
      ))}

      {videoLinks.length > 0 && (
        <section className="space-y-2">
          <Heading as="h3" size="subsection" className="text-2xl md:text-2xl">
            Watch
          </Heading>
          <ul className="space-y-1.5">
            {videoLinks.map((link) => (
              <li key={link}>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-accent underline"
                >
                  <Small>{link}</Small>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
