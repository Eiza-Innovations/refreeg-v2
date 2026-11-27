import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { useCauseForm } from "@/hooks/use-cause-form";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/ui/field-error";

type Props = Pick<
  ReturnType<typeof useCauseForm>,
  | "form"
  | "errors"
  | "setFormFields"
  | "addSection"
  | "removeSection"
  | "updateSection"
>;

export function CauseStoryStep({
  form,
  errors,
  setFormFields,
  addSection,
  removeSection,
  updateSection,
}: Props) {
  const { title, summary, sections } = form;
  const wordCount = sections.reduce(
    (count, section) =>
      count + (section.description.match(/\S+/g)?.length ?? 0),
    0,
  );
  const inputClass = "h-12 premium-input";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title" className="label-eyebrow">
          Campaign title
        </Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. Clean water for Owerri"
          value={title}
          onChange={(event) => setFormFields("title", event.target.value)}
          aria-invalid={Boolean(errors.title)}
          className={inputClass}
        />
        <FieldError message={errors.title} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="summary" className="label-eyebrow">
          Short summary (optional)
        </Label>
        <Input
          id="summary"
          name="summary"
          placeholder="A one-line description for your campaign page"
          value={summary}
          onChange={(event) => setFormFields("summary", event.target.value)}
          maxLength={200}
          aria-invalid={Boolean(errors.summary)}
          className={inputClass}
        />
        <FieldError message={errors.summary} />
      </div>

      <Separator className="bg-hairline" />
      <div className="space-y-4">
        <Eyebrow>The story</Eyebrow>
        {sections.map((section, index) => {
          const sectionErrors = errors.sections?.[index];
          return (
            <div key={index} className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`section-heading-${index}`}>
                    Section heading
                  </Label>
                  {index > 0 && (
                    <Button
                      type="button"
                      onClick={() => removeSection(index)}
                      variant="ghost"
                      size="sm"
                      className="text-rust hover:bg-rust/10 hover:text-rust"
                    >
                      Remove section
                    </Button>
                  )}
                </div>
                <Input
                  id={`section-heading-${index}`}
                  placeholder="e.g. Why this matters"
                  value={section.heading}
                  onChange={(event) =>
                    updateSection(index, "heading", event.target.value)
                  }
                  aria-invalid={Boolean(sectionErrors?.heading)}
                  className={inputClass}
                />
                <FieldError message={sectionErrors?.heading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`section-description-${index}`}>
                  Story content
                </Label>
                <Textarea
                  id={`section-description-${index}`}
                  placeholder="Share the problem, who it affects, and how this campaign helps."
                  value={section.description}
                  onChange={(event) =>
                    updateSection(index, "description", event.target.value)
                  }
                  aria-invalid={Boolean(sectionErrors?.description)}
                  className={cn(
                    "premium-input",
                    index === 0 ? "min-h-52" : "min-h-32",
                  )}
                />
                <FieldError message={sectionErrors?.description} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2">
        <P className="text-xs text-ink/70">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </P>
        <Button
          type="button"
          variant="link"
          onClick={addSection}
          className="h-auto p-0 text-blue-accent"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add a section
        </Button>
      </div>
    </div>
  );
}
import { P } from "@/components/marketing/Typography";
