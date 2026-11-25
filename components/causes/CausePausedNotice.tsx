import Link from "next/link";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/marketing/Typography";
import { Ban, Clock3 } from "lucide-react";

export function CausePausedNotice({
  title,
  removed = false,
}: {
  title: string;
  removed?: boolean;
}) {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
      <Eyebrow>{removed ? "Removed after review" : "Campaign paused"}</Eyebrow>
      <Heading
        as="h1"
        size="subsection"
        className="mt-3 font-semibold md:text-3xl"
      >
        {title}
      </Heading>

      {removed ? (
        <CalloutBanner
          className="mt-6 text-left"
          variant="rust"
          icon={<Ban className="mt-0.5 h-5 w-5 shrink-0" />}
          title="This campaign was removed after review"
          description="Our review team took it down and it no longer accepts donations. Donors are contacted directly about their gifts."
        />
      ) : (
        <CalloutBanner
          className="mt-6 text-left"
          variant="gold"
          icon={<Clock3 className="mt-0.5 h-5 w-5 shrink-0" />}
          title="This campaign is temporarily paused"
          description="Its owner is updating the campaign details. Donations are on hold until that's reviewed and approved. You can still find it listed, just not open it yet."
        />
      )}

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/causes">
          <Button variant="ink">Browse other campaigns</Button>
        </Link>
      </div>
    </div>
  );
}
