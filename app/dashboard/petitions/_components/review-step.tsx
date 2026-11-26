import dynamic from "next/dynamic";
import { differenceInDays, format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Skeleton } from "@/components/ui/skeleton";
import { Heading, P, Small, Strong } from "@/components/marketing/Typography";
import { StepHeading } from "./StepHeading";
import { useObjectUrl, useObjectUrls } from "@/hooks/use-object-urls";
import { petitionCategoryOptions } from "@/lib/options/petition.options";
import type { PetitionFormFields } from "@/lib/schemas/petition.schema";

const MultimediaCarousel = dynamic(
  () => import("@/components/marketing/MultimediaCarousel"),
  { loading: () => <Skeleton className="h-64 w-full" /> },
);

export function PetitionReviewStep({ form }: { form: PetitionFormFields }) {
  const coverUrl = useObjectUrl(form.coverImage);
  const mediaUrls = useObjectUrls(form.multimedia);
  const category = petitionCategoryOptions.find(
    (option) => option.value === form.category,
  );

  return (
    <div className="space-y-6">
      <StepHeading
        title="Check before you submit"
        text="This is how your petition will read. Our team reviews it before it goes live."
      />

      <Card variant="parchment" className="space-y-5 p-6">
        <div className="space-y-1">
          <Eyebrow>{category?.label}</Eyebrow>
          <Heading as="h3" size="block">
            {form.title}
          </Heading>
        </div>

        <MultimediaCarousel
          media={[...mediaUrls, ...form.videoLinks]}
          coverImage={coverUrl || form.image || undefined}
          title={form.title}
        />

        <div className="space-y-4">
          {form.sections.map((section, index) => (
            <div key={index} className="space-y-1">
              <Strong>{section.heading}</Strong>
              <P className="whitespace-pre-line text-ink/70">
                {section.description}
              </P>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="surface" className="grid gap-4 p-6 sm:grid-cols-2">
        <div>
          <Eyebrow>Signature goal</Eyebrow>
          <p className="mt-1 font-fraunces text-2xl text-ink">
            {Number(form.goal).toLocaleString()}
          </p>
        </div>
        <div>
          <Eyebrow>Duration</Eyebrow>
          {form.startDate && form.endDate ? (
            <>
              <p className="mt-1 font-fraunces text-2xl text-ink">
                {differenceInDays(form.endDate, form.startDate)} days
              </p>
              <Small className="text-ink/60">
                {format(form.startDate, "PPP")} to {format(form.endDate, "PPP")}
              </Small>
            </>
          ) : (
            <Small className="mt-1 block text-ink/60">Not set</Small>
          )}
        </div>
      </Card>

      {form.multimedia.length > 0 && (
        <Card variant="surface" className="space-y-3 p-6">
          <Eyebrow>Uploaded files</Eyebrow>
          <ul className="grid gap-3 sm:grid-cols-2">
            {form.multimedia.map((file, index) => (
              <li key={index}>
                <Strong>{file.name}</Strong>
                <Small className="block text-ink/60">
                  {file.type.startsWith("image/") ? "Image" : "Video"} ·{" "}
                  {Math.round(file.size / 1024)} KB
                </Small>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
