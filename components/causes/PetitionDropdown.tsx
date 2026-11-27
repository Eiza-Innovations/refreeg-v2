"use client";

import { MyItemMenu } from "@/components/dashboard/MyItemMenu";
import { deletePetition } from "@/actions/petitions/petition-actions";

interface PetitionDropdownProps {
  petitionId: string;
}

export function PetitionDropdown({ petitionId }: PetitionDropdownProps) {
  return (
    <MyItemMenu
      noun="petition"
      viewHref={`/petitions/${petitionId}`}
      editHref={`/dashboard/petitions/${petitionId}/edit`}
      onDelete={() => deletePetition(petitionId)}
    />
  );
}
