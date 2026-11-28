import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { P } from "@/components/marketing/Typography";

export function StorySections({
  sections,
}: {
  sections: { heading: string; description: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const isLongStory =
    sections.length > 2 ||
    sections.reduce(
      (total, section) =>
        total + section.heading.length + section.description.length,
      0,
    ) > 650;
  const visible = expanded ? sections : sections.slice(0, 2);

  return (
    <div>
      <div
        className={`relative space-y-4 ${isLongStory && !expanded ? "max-h-[210px] overflow-hidden" : ""}`}
      >
        {visible.map((section, index) => (
          <div
            key={index}
            className="border-b border-hairline pb-5 last:border-0 last:pb-0"
          >
            <P className="font-semibold text-ink md:text-base">
              {section.heading}
            </P>
            <P className="mt-2 whitespace-pre-line text-ink/70 md:text-sm">
              {section.description}
            </P>
          </div>
        ))}
        {isLongStory && !expanded && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface via-surface/90 to-transparent"
            aria-hidden="true"
          />
        )}
      </div>
      {isLongStory && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-forest hover:text-forest/80"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}

export function CollapsibleStoryText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLongStory = text.length > 650;

  return (
    <div>
      <div
        className={`relative ${isLongStory && !expanded ? "max-h-[210px] overflow-hidden" : ""}`}
      >
        <P className="whitespace-pre-line text-ink/70 md:text-sm">{text}</P>
        {isLongStory && !expanded && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface via-surface/90 to-transparent"
            aria-hidden="true"
          />
        )}
      </div>
      {isLongStory && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-forest hover:text-forest/80"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}
