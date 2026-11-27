import { CalloutBanner } from "@/components/ui/callout-banner";

export default function NotFound() {
  return (
    <CalloutBanner
      variant="rust"
      title="Not found"
      description="The requested KYC review could not be found."
      className="mx-auto mt-8 max-w-xl"
    />
  );
}
