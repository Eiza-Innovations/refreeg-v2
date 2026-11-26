import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { petitionCategoryOptions } from "@/lib/options/petition.options";
import { cn } from "@/lib/utils";
import {
  fieldClass,
  selectContentClass,
  selectItemClass,
  selectTriggerClass,
} from "@/components/petitions/field-styles";
import { FieldError } from "@/components/ui/field-error";
import { StepHeading } from "./StepHeading";
import type { PetitionCopy } from "./petition-copy";
import type { PetitionFormApi } from "@/hooks/use-petition-form";

type Props = Pick<PetitionFormApi, "form" | "errors" | "setFormFields"> & {
  copy: PetitionCopy;
};

export function PetitionBasicsStep({
  form,
  errors,
  setFormFields,
  copy,
}: Props) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StepHeading
        title={copy.basics?.title ?? "The basics"}
        text={
          copy.basics?.text ??
          "Name your petition and set how many signatures you need."
        }
      />

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Petition Title</Label>
          <Input
            id="title"
            name="title"
            placeholder={copy.titlePlaceholder}
            value={form.title}
            onChange={(e) => setFormFields("title", e.target.value)}
            className={cn(
              fieldClass,
              "h-12 text-lg",
              errors.title && "border-rust",
            )}
          />
          <FieldError message={errors.title} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={form.category}
              // Radix reports "" when a restored draft value is applied after mount.
              onValueChange={(value) =>
                value && setFormFields("category", value)
              }
            >
              <SelectTrigger
                className={cn(
                  selectTriggerClass,
                  "h-12",
                  errors.category && "border-rust",
                )}
              >
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                {petitionCategoryOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className={selectItemClass}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.category} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Signature Goal</Label>
            <div className="relative">
              <Input
                id="goal"
                name="goal"
                type="number"
                placeholder={copy.goalPlaceholder}
                value={form.goal}
                onChange={(e) => setFormFields("goal", e.target.value)}
                className={cn(
                  fieldClass,
                  "h-12 pl-4 text-lg",
                  errors.goal && "border-rust",
                )}
              />
              <Eyebrow className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-ink/40">
                Signatures
              </Eyebrow>
            </div>
            <FieldError message={errors.goal} />
          </div>
        </div>
      </div>
    </div>
  );
}
