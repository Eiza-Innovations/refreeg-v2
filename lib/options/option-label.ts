import type { Option } from "@/types/options";

/** The label for a value in an options list, or the value itself when unknown. */
export function optionLabel(options: readonly Option[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** The value if it is in the options list, otherwise the fallback. */
export function optionValue(
  options: readonly Option[],
  value: string | undefined,
  fallback: string,
) {
  return options.find((option) => option.value === value)?.value ?? fallback;
}
