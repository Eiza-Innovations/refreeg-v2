import { Suspense } from "react";
import { FundingVelocityClient } from "./FundingVelocityClient";

export const metadata = { title: "Funding velocity | RefreeG Admin" };

export default function Page() {
  return (
    <Suspense>
      <FundingVelocityClient />
    </Suspense>
  );
}
