import { CampaignCategorySelect } from "@/components/causes/CampaignCategorySelect";
import { CampaignLocationAutocomplete } from "@/components/causes/CampaignLocationAutocomplete";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { useCauseForm } from "@/hooks/use-cause-form";
import type { CauseFormMode } from "@/lib/schemas/cause.schema";

type Props = Pick<
  ReturnType<typeof useCauseForm>,
  "form" | "errors" | "setFormFields"
> & {
  mode: CauseFormMode;
};

export function CauseBasicsStep({ mode, form, errors, setFormFields }: Props) {
  const usesSuggestions = mode === "edit";
  const invalid = Boolean(errors.location);
  const locationClass = "h-12 premium-input";
  const onLocationChange = (location: string) =>
    setFormFields("location", location);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <CampaignCategorySelect
          variant="tiles"
          value={form.category}
          onValueChange={(value) => setFormFields("category", value)}
          invalid={Boolean(errors.category)}
        />
        <FieldError message={errors.category} />
      </div>
      <Separator className="bg-hairline" />
      <div className="space-y-2">
        <Label htmlFor="location" className="label-eyebrow">
          Location
        </Label>
        {usesSuggestions ? (
          <CampaignLocationAutocomplete
            value={form.location}
            invalid={invalid}
            onChange={onLocationChange}
            className={locationClass}
          />
        ) : (
          <Input
            id="location"
            name="location"
            value={form.location}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder="City, state, country"
            maxLength={100}
            aria-invalid={invalid}
            className={locationClass}
          />
        )}
        {usesSuggestions && (
          <P className="text-xs text-ink/70">
            Type at least two letters, then select a place from the list.
          </P>
        )}
        <FieldError message={errors.location} />
      </div>
    </div>
  );
}
import { P } from "@/components/marketing/Typography";
