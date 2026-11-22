import type { Bounty, BountyFormFields } from "@/types/bounty-types";

export const emptyBountyForm: BountyFormFields = {
  title: "",
  campaign: "",
  category: "",
  description: "",
  deliverable: "",
  reward: "",
  availableSpots: "",
  deadline: "",
};

export const sampleBountyForm: BountyFormFields = {
  title: "Create a 60-second campaign video",
  campaign: "clean-water",
  category: "content",
  description:
    "Create a short vertical video that explains why the Odo-Ado community needs a clean water borehole.",
  deliverable:
    "Submit one edited MP4 video, the source footage and a caption ready for Instagram or TikTok.",
  reward: "25000",
  availableSpots: "3",
  deadline: "2026-12-18",
};

export const ownerBounties: Bounty[] = [
  {
    id: "campaign-video",
    title: "Create a 60-second campaign video",
    campaign: "Clean water for Odo-Ado",
    category: "Content creation",
    description:
      "Create a short vertical video that explains why the community needs a clean water borehole.",
    deliverable: "One edited MP4 video, source footage and a social caption.",
    reward: 25000,
    availableSpots: 3,
    deadline: "2026-12-18",
    submittedAt: "2026-11-21",
    owner: "Adedayo Johnson",
    status: "in-review",
    submissions: 0,
  },
  {
    id: "school-outreach",
    title: "Recruit five school outreach volunteers",
    campaign: "School kits for 300 pupils",
    category: "Community outreach",
    description:
      "Help coordinate volunteers for the school-kit distribution day.",
    deliverable: "A confirmed list of five volunteers and their availability.",
    reward: 12000,
    availableSpots: 2,
    deadline: "2026-12-10",
    submittedAt: "2026-11-19",
    owner: "Adedayo Johnson",
    status: "changes-requested",
    submissions: 0,
    changesRequested:
      "Clarify whether transport is included and add the exact event location.",
  },
  {
    id: "food-bank-stories",
    title: "Document three beneficiary stories",
    campaign: "Community food bank",
    category: "Content creation",
    description:
      "Interview beneficiaries and document how the food bank supports their households.",
    deliverable: "Three approved written stories with portrait photographs.",
    reward: 18000,
    availableSpots: 3,
    deadline: "2026-12-28",
    submittedAt: "2026-11-12",
    owner: "Adedayo Johnson",
    status: "live",
    submissions: 7,
  },
];

export const adminBounties: Bounty[] = [
  ownerBounties[0],
  {
    id: "clinic-fundraiser",
    title: "Bring 20 new donors to the clinic campaign",
    campaign: "Equip Ajegunle community clinic",
    category: "Fundraising",
    description:
      "Share the campaign with new supporters and help twenty people complete a donation.",
    deliverable: "Twenty unique donation references linked to the applicant.",
    reward: 30000,
    availableSpots: 4,
    deadline: "2026-12-22",
    submittedAt: "2026-11-22",
    owner: "Mariam Bello",
    status: "in-review",
    submissions: 0,
  },
  ownerBounties[1],
  ownerBounties[2],
];

export function getBountyById(id: string) {
  return adminBounties.find((bounty) => bounty.id === id) ?? adminBounties[0];
}
