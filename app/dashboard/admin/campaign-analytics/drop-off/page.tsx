import { Suspense } from "react";
import { DropOffClient } from "./DropOffClient";

export const metadata = { title: "Drop-off points | RefreeG Admin" };

export default function Page() {
  return (
    <Suspense>
      <DropOffClient />
    </Suspense>
  );
}
