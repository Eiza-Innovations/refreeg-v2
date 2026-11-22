import type { Metadata } from "next";
import { BountyReview } from "@/components/bounties/BountyReview";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata: Metadata = {
  title: "Review bounty",
};

export default function ReviewBountyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-2">
        <Eyebrow>Step 2 of 2</Eyebrow>
        <h1 className="font-fraunces text-3xl tracking-tight text-ink sm:text-4xl">
          Review and submit
        </h1>
        <p className="text-sm leading-6 text-ink/60">
          Check the public details and maximum reward commitment before sending
          this bounty for approval.
        </p>
      </div>
      <BountyReview />
    </div>
  );
}
