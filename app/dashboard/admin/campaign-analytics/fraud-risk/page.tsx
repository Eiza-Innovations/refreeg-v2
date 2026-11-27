import { Suspense } from "react";
import { FraudRiskClient } from "./FraudRiskClient";

export const metadata = { title: "Fraud risk indicators | RefreeG Admin" };

export default function Page() {
  return (
    <Suspense>
      <FraudRiskClient />
    </Suspense>
  );
}
