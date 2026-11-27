export type LocationSelectorProps = {
  selected: string;
  onChange: (value: string) => void;
  mode: "country" | "state" | "city";
  label?: string;
  /** Shows the red required marker beside the label. */
  required?: boolean;
  placeholder?: string;
  countryName?: string;
  stateName?: string;
  /** `new` uses the current design system styling. */
  tone?: "default" | "new";
};
