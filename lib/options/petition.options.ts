import { categories } from "@/lib/causes/categories";
import type { Option } from "@/types/options";

export const myPetitionStatusOptions = [
  { label: "All", value: "all" },
  { label: "Live", value: "approved" },
  { label: "Under review", value: "pending" },
  { label: "Needs revision", value: "rejected" },
] as const satisfies readonly Option[];

export const petitionCategoryOptions = categories.map(({ id, name }) => ({
  label: name,
  value: id,
})) satisfies Option[];
