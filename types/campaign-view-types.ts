import type { Cause } from "@/types";
import type { Comment } from "@/types/common-types";
import type { ProofUpdate } from "@/types/proof-types";

export type TabKey = "Comments" | "FAQ";

export type ProfileSummary = {
  email: string;
  name: string;
  id: string;
  subaccount: string;
};

export type Donor = {
  id: string;
  name?: string | null;
  amount?: number | null;
  created_at?: string | null;
};

export type CauseDetail = Cause & {
  user: {
    name: string;
    email: string;
    sub_account_code?: string | null;
    flutterwave_sub_account_id?: string | null;
    username: string;
    profile_photo?: string | null;
  };
  sections?: { heading: string; description: string }[];
  summary?: string | null;
  location?: string | null;
  verified_status?: string;
  trust_score?: { impact: string; readability: string; transparency: string };
  multimedia?: string[];
  video_links?: string[];
  faqs?: { question: string; answer: string }[];
  isFollowing?: boolean;
};

export type CampaignQualityLabProps = {
  cause: CauseDetail;
  donors: Donor[];
  comments: Comment[];
  profile: ProfileSummary;
  creatorHasWallet: boolean;
  currentUserId?: string;
  proofUpdates?: ProofUpdate[];
};

export type PledgeScreenProps = {
  cause: CauseDetail;
  profile: ProfileSummary;
};
