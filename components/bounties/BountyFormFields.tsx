import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  bountyCampaignOptions,
  bountyCategoryOptions,
} from "@/lib/options/bounty.options";
import type { BountyFormFields as BountyFields } from "@/types/bounty-types";

type BountyFieldErrors = Partial<Record<keyof BountyFields, string>>;

export function BountyFormFields({
  form,
  errors,
  onChange,
}: {
  form: BountyFields;
  errors: BountyFieldErrors;
  onChange: <K extends keyof BountyFields>(
    key: K,
    value: BountyFields[K],
  ) => void;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="title">Bounty title</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder="e.g. Create a 60-second campaign video"
        />
        <FieldError message={errors.title} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Campaign</Label>
          <Select
            value={form.campaign}
            onValueChange={(value) => onChange("campaign", value)}
          >
            <SelectTrigger aria-label="Choose campaign">
              <SelectValue placeholder="Choose a campaign" />
            </SelectTrigger>
            <SelectContent>
              {bountyCampaignOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.campaign} />
        </div>

        <div className="grid gap-2">
          <Label>Category</Label>
          <Select
            value={form.category}
            onValueChange={(value) => onChange("category", value)}
          >
            <SelectTrigger aria-label="Choose bounty category">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {bountyCategoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.category} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">What needs to be done?</Label>
        <Textarea
          id="description"
          rows={4}
          value={form.description}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder="Explain the task, who it helps and any important context."
        />
        <FieldError message={errors.description} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="deliverable">What counts as complete?</Label>
        <Textarea
          id="deliverable"
          rows={3}
          value={form.deliverable}
          onChange={(event) => onChange("deliverable", event.target.value)}
          placeholder="List the proof or files the applicant must submit."
        />
        <FieldError message={errors.deliverable} />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="reward">Reward per approved submission</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/50">
              ₦
            </span>
            <Input
              id="reward"
              type="number"
              min="1"
              className="pl-7"
              value={form.reward}
              onChange={(event) => onChange("reward", event.target.value)}
              placeholder="25,000"
            />
          </div>
          <FieldError message={errors.reward} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="availableSpots">Available spots</Label>
          <Input
            id="availableSpots"
            type="number"
            min="1"
            value={form.availableSpots}
            onChange={(event) => onChange("availableSpots", event.target.value)}
            placeholder="3"
          />
          <FieldError message={errors.availableSpots} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="deadline">Submission deadline</Label>
          <Input
            id="deadline"
            type="date"
            value={form.deadline}
            onChange={(event) => onChange("deadline", event.target.value)}
          />
          <FieldError message={errors.deadline} />
        </div>
      </div>
    </>
  );
}
