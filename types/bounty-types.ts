export type BountyStatus = "draft" | "in-review" | "changes-requested" | "live";

export type BountyFormFields = {
  title: string;
  campaign: string;
  category: string;
  description: string;
  deliverable: string;
  reward: string;
  availableSpots: string;
  deadline: string;
};

export type Bounty = {
  id: string;
  title: string;
  campaign: string;
  category: string;
  description: string;
  deliverable: string;
  reward: number;
  availableSpots: number;
  deadline: string;
  submittedAt: string;
  owner: string;
  status: BountyStatus;
  submissions: number;
  changesRequested?: string;
};
