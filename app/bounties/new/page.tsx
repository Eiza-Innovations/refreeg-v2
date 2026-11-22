import type { Metadata } from "next";
import { BountyForm } from "@/components/bounties/BountyForm";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata: Metadata = {
  title: "New bounty",
};

export default function NewBountyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-2">
        <Eyebrow>Step 1 of 2</Eyebrow>
        <h1 className="font-fraunces text-3xl tracking-tight text-ink sm:text-4xl">
          New bounty
        </h1>
        <p className="text-sm leading-6 text-ink/60">
          Set one clear task, the proof you need and the reward for each
          approved submission.
        </p>
      </div>
      <BountyForm />
    </div>
  );
}
