import { endDateFromDaysActive } from "@/lib/duration";
import type { PetitionFormFields } from "@/lib/schemas/petition.schema";
import type { Petition } from "@/types";

export const emptyPetitionValues: PetitionFormFields = {
  title: "",
  category: "",
  goal: "",
  coverImage: null,
  image: "",
  sections: [{ heading: "", description: "" }],
  startDate: undefined,
  endDate: undefined,
  multimedia: [],
  videoLinks: [],
};

export function petitionToFormValues(petition: Petition): PetitionFormFields {
  const startDate = petition.days_active ? new Date() : undefined;
  return {
    ...emptyPetitionValues,
    title: petition.title,
    category: petition.category,
    goal: petition.goal.toString(),
    image: petition.image || "",
    sections: petition.sections || emptyPetitionValues.sections,
    startDate,
    endDate: startDate && endDateFromDaysActive(petition.days_active),
    videoLinks: petition.video_links || [],
  };
}
