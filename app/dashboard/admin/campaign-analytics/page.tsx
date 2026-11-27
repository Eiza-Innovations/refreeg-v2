import { Suspense } from "react";
import { CampaignOverviewClient } from "./CampaignOverviewClient";

export const metadata = { title: "Campaign analytics | RefreeG Admin" };

export default function Page() {
  return (
    <Suspense>
      <CampaignOverviewClient />
    </Suspense>
  );
}
