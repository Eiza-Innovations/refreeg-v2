import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fieldClass } from "@/components/petitions/field-styles";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StepHeading } from "./step-heading";
import type { PetitionCopy } from "./petition-copy";
import type { PetitionFormApi } from "@/hooks/use-petition-form";

type Props = Pick<
  PetitionFormApi,
  "form" | "addSection" | "removeSection" | "updateSection"
> & { copy: PetitionCopy };

export function PetitionStoryStep({
  form,
  addSection,
  removeSection,
  updateSection,
  copy,
}: Props) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <StepHeading title={copy.storyTitle} text={copy.storyText} />
        <Button
          type="button"
          onClick={addSection}
          variant="outline"
          className="rounded-xl border-ink bg-surface text-ink hover:bg-bone"
        >
          Add Section
        </Button>
      </div>

      <div className="space-y-6">
        {form.sections.map((section, index) => (
          <Card key={index} variant="surface" className="overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="-mx-6 -mt-6 mb-2 flex items-center justify-between border-b border-hairline bg-bone p-4">
                <Eyebrow>Section {index + 1}</Eyebrow>
                {index > 0 && (
                  <Button
                    type="button"
                    onClick={() => removeSection(index)}
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg text-rust hover:bg-rust/10 hover:text-rust"
                  >
                    {copy.removeSection}
                  </Button>
                )}
              </div>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor={`section-heading-${index}`}>
                    {copy.headingLabel}
                  </Label>
                  <Input
                    id={`section-heading-${index}`}
                    placeholder={copy.headingPlaceholder}
                    value={section.heading}
                    onChange={(e) =>
                      updateSection(index, "heading", e.target.value)
                    }
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`section-description-${index}`}>
                    {copy.contentLabel}
                  </Label>
                  <Textarea
                    id={`section-description-${index}`}
                    placeholder={copy.contentPlaceholder}
                    value={section.description}
                    onChange={(e) =>
                      updateSection(index, "description", e.target.value)
                    }
                    className={cn(fieldClass, "min-h-[150px] resize-none")}
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
