import { useMemo } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { Heading, P } from "@/components/marketing/Typography";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useObjectUrl, useObjectUrls } from "@/hooks/use-object-urls";
import { categories } from "@/lib/causes/categories";
import { isVideoFile } from "@/lib/media/video";
import type { CauseFormValues } from "@/lib/schemas/cause.schema";

const MultimediaCarousel = dynamic(
  () => import("@/components/marketing/MultimediaCarousel"),
  { loading: () => <Skeleton className="aspect-video w-full" /> },
);

type Props = {
  form: CauseFormValues;
  onEdit: (step: number) => void;
  busy: boolean;
};

export function CauseReviewStep({ form, onEdit, busy }: Props) {
  const {
    category,
    location,
    goal,
    currency,
    startDate,
    endDate,
    sections,
    multimedia,
    videoLinks,
  } = form;
  const categoryName =
    categories.find(({ id }) => id === category)?.name ?? category;
  const cover = useObjectUrl(form.coverImage) || form.image;
  const localFiles = useMemo(
    () => multimedia.filter((item): item is File => typeof item !== "string"),
    [multimedia],
  );
  const localMediaUrls = useObjectUrls(localFiles);
  let fileIndex = 0;
  const media = multimedia
    .map((item) => {
      if (typeof item === "string") return item;
      const url = localMediaUrls[fileIndex++];
      if (!url) return undefined;
      return {
        url,
        type: isVideoFile(item) ? ("video" as const) : ("image" as const),
      };
    })
    .filter((item) => item !== undefined);
  const mediaCount =
    Number(Boolean(form.coverImage || form.image)) +
    multimedia.length +
    videoLinks.filter((link) => link.trim()).length;
  const formattedGoal = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
  }).format(Number(goal));
  const rows = [
    {
      label: "Cause",
      value: [categoryName, location].filter(Boolean).join(" · "),
    },
    {
      label: "Story",
      value: `${sections.length} ${sections.length === 1 ? "section" : "sections"}`,
    },
    {
      label: "Target",
      value: formattedGoal,
      note:
        startDate && endDate
          ? `${format(startDate, "d MMM yyyy")} – ${format(endDate, "d MMM yyyy")}`
          : undefined,
    },
    {
      label: "Photos and videos",
      value: `${mediaCount} ${mediaCount === 1 ? "item" : "items"}`,
    },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card
        variant="surface"
        className="min-w-0 overflow-hidden rounded-2xl border-0 bg-bone shadow-none"
      >
        <MultimediaCarousel
          media={[...media, ...videoLinks]}
          coverImage={cover || undefined}
          title={form.title}
          variant="flush"
        />
        <div className="space-y-2 p-4">
          <Heading as="h2" size="panel" className="break-words font-medium">
            {form.title}
          </Heading>
          {form.summary && (
            <P className="break-words text-sm text-ink/70">{form.summary}</P>
          )}
          <Accordion type="single" collapsible>
            <AccordionItem value="story" className="border-b-0">
              <AccordionTrigger className="py-2 text-sm">
                Preview story
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                {sections.map((section, index) => (
                  <div key={index} className="space-y-1 break-words">
                    <Heading
                      as="h3"
                      size="panel"
                      className="font-montserrat text-base font-semibold"
                    >
                      {section.heading}
                    </Heading>
                    <P className="whitespace-pre-line leading-6 text-ink/70">
                      {section.description}
                    </P>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </Card>

      <dl className="min-w-0 divide-y divide-hairline">
        {rows.map(({ label, value, note }, index) => (
          <div
            key={label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 first:pt-0"
          >
            <dt className="text-xs text-ink/70">{label}</dt>
            <dd className="col-start-1 break-words text-sm font-medium">
              {value}
              {note && (
                <P className="mt-1 text-xs font-normal text-ink/70">{note}</P>
              )}
            </dd>
            <dd className="col-start-2 row-span-2 row-start-1">
              <Button
                type="button"
                variant="link"
                aria-label={`Edit ${label.toLowerCase()}`}
                disabled={busy}
                onClick={() => onEdit(index + 1)}
                className="text-blue-accent"
              >
                Edit
              </Button>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
