"use client";

import { MyItemMenu } from "@/components/dashboard/MyItemMenu";
import { deleteCause } from "@/actions/causes/cause-actions";

interface CauseDropdownProps {
  causeId: string;
  causeSlug?: string | null;
}

export function CauseDropdown({ causeId, causeSlug }: CauseDropdownProps) {
  return (
    <MyItemMenu
      noun="campaign"
      viewHref={`/causes/${causeSlug || causeId}`}
      editHref={`/dashboard/causes/${causeId}/edit`}
      onDelete={() => deleteCause(causeId)}
    />
  );
}
