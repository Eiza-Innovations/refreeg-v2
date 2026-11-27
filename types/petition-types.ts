import type {
  PetitionStatus,
  Category,
  subHeadings,
  subHeadingWithSubDescription,
} from "./common-types";
import type { usePetitionForm } from "@/hooks/use-petition-form";
import type { usePetitionSignForm } from "@/hooks/use-petition-sign-form";
import type { PetitionCopy } from "@/app/dashboard/petitions/_components/petition-copy";

export interface Petition {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  goal: number;
  raised: number;
  signatures?: number;
  status: PetitionStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  image?: string | null;
  days_active?: number | null;
  profiles?: {
    full_name: string;
    email: string;
    profile_photo?: string | null;
    is_verified?: boolean;
  };
  sections?: { heading: string; description: string }[];
  multimedia?: string[];
  video_links?: string[];
}
export interface PetitionWithUser extends Petition {
  user: {
    name: string;
    email: string;
    sub_account_code?: string;
  };
}

export interface PetitionFormData {
  title: string;
  description: string;
  category: string;
  goal: string | number;
  coverImage: File | string | null;
  image?: string;
  multimedia?: (File | string)[];
  sections?: { heading: string; description: string }[];
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  video_links?: string[];
}
export interface PetitionFilterOptions {
  category?: string;
  categories?: string[];
  status?: PetitionStatus;
  userId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: "recommended" | "latest" | "most-funded" | "ending-soon";
  verifiedOnly?: boolean;
}

export type SocialLinks = {
  twitter: string;
  facebook: string;
  instagram: string;
  linkedin: string;
};

export type PetitionFormApi = ReturnType<typeof usePetitionForm>;

export type PetitionSignFormApi = ReturnType<typeof usePetitionSignForm>;

/** Props of the petition wizard steps that edit the basic fields and dates. */
export type PetitionFieldsStepProps = Pick<
  PetitionFormApi,
  "form" | "errors" | "setFormFields"
> & { copy: PetitionCopy };

export type PetitionStoryStepProps = Pick<
  PetitionFormApi,
  "form" | "addSection" | "removeSection" | "updateSection"
> & { copy: PetitionCopy };

export type PetitionMediaStepProps = Pick<
  PetitionFormApi,
  | "form"
  | "errors"
  | "uploadCover"
  | "removeCover"
  | "uploadGallery"
  | "removeGalleryFile"
  | "setVideoLink"
  | "addVideoLink"
  | "removeVideoLink"
> & { copy: PetitionCopy };

export type SignFormFieldsProps = Pick<
  PetitionSignFormApi,
  "form" | "errors" | "setFormFields"
> & {
  /** Keeps element ids unique when two forms share a page. */
  idPrefix: string;
  disabled?: boolean;
};

export type MediaErrors = { coverImage?: string; multimedia?: string };
