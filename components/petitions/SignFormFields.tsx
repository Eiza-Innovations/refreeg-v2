import { cn } from "@/lib/utils";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fieldClass } from "@/components/ui/field-styles";
import type { SignFormFieldsProps } from "@/types/petition-types";

/** Name, email, message and anonymous switch of a petition signing form. */
export function SignFormFields({
  form,
  errors,
  setFormFields,
  idPrefix,
  disabled = false,
}: SignFormFieldsProps) {
  const inputClass = cn(
    fieldClass,
    disabled && "cursor-not-allowed bg-cream-muted",
  );

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Your name</Label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="Enter your name"
          value={form.name}
          onChange={(event) => setFormFields("name", event.target.value)}
          disabled={form.isAnonymous || disabled}
          className={inputClass}
        />
        <FieldError message={errors.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-email`}>Email</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          placeholder="Enter your email"
          value={form.email}
          onChange={(event) => setFormFields("email", event.target.value)}
          disabled={disabled}
          className={inputClass}
        />
        <FieldError message={errors.email} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-message`}>Message (optional)</Label>
        <Textarea
          id={`${idPrefix}-message`}
          placeholder="Leave a message of support"
          value={form.message}
          onChange={(event) => setFormFields("message", event.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id={`${idPrefix}-anonymous`}
          checked={form.isAnonymous}
          onCheckedChange={(checked) => setFormFields("isAnonymous", checked)}
          disabled={disabled}
        />
        <Label
          htmlFor={`${idPrefix}-anonymous`}
          className={disabled ? "text-ink/40" : ""}
        >
          Sign anonymously
        </Label>
      </div>
    </>
  );
}
