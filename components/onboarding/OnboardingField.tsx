import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import type { OnboardingFieldProps } from "@/types/onboarding-types";

/** A label, the control passed as children, and its error, for onboarding forms. */
export function OnboardingField({
  label,
  htmlFor,
  required,
  error,
  className,
  children,
}: OnboardingFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-rust"> *</span> : null}
      </Label>
      <div className="mt-1.5">{children}</div>
      <FieldError message={error} />
    </div>
  );
}
