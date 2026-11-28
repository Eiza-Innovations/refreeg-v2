import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Share2, CheckCheck, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { P, Span } from "@/components/marketing/Typography";
import { SupportErrorCta } from "@/components/engagement/SupportErrorCta";
import { followCampaign } from "@/actions/causes/cause-actions";
import type { Donor } from "@/types/campaign-view-types";
import { fadeUp } from "@/lib/causes/campaign-constants";

export function CampaignHealthCard({
  donors,
  causeId,
  causePath,
  currentUserId,
  isFollowing,
}: {
  donors: Donor[];
  causeId: string;
  causePath: string;
  currentUserId?: string;
  isFollowing?: boolean;
}) {
  const recentDonors = useMemo(
    () =>
      donors.map((donor) => ({
        id: donor.id,
        name: donor.name || "Anonymous",
        amount: donor.amount || 0,
      })),
    [donors],
  );

  const [followed, setFollowed] = useState(isFollowing || false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleFollow = () => {
    if (!currentUserId) {
      setShowLoginModal(true);
      return;
    }
    startTransition(async () => {
      setFollowError(null);
      const result = await followCampaign(causeId);
      if (result.error && result.error !== "unauthenticated") {
        setFollowError(result.error);
        setShowSupportModal(true);
      } else if (result.error === "unauthenticated") {
        setShowLoginModal(true);
      } else {
        setFollowed(true);
      }
    });
  };

  return (
    <motion.div
      className="rounded-[20px] border border-hairline bg-surface p-6"
      variants={fadeUp}
    >
      <div className="flex items-center justify-between">
        <Eyebrow>Recent donors</Eyebrow>
        <Share2 className="h-4 w-4 text-ink/40" />
      </div>
      <div className="mt-3 grid gap-3 text-sm text-ink/70">
        {recentDonors.length > 0 ? (
          <>
            {recentDonors.slice(0, 3).map((donor) => (
              <div key={donor.id} className="flex items-center justify-between">
                <Span className="truncate pr-2 text-sm text-ink/80">
                  {donor.name}
                </Span>
                <Span className="shrink-0 text-sm font-medium tabular-nums text-forest">
                  ₦{Number(donor.amount).toLocaleString()}
                </Span>
              </div>
            ))}
            {recentDonors.length > 3 && (
              <details className="group border-t border-hairline pt-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-forest">
                  View all donors
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3 grid gap-3">
                  {recentDonors.slice(3).map((donor) => (
                    <div
                      key={donor.id}
                      className="flex items-center justify-between"
                    >
                      <Span className="truncate pr-2 text-sm text-ink/80">
                        {donor.name}
                      </Span>
                      <Span className="shrink-0 text-sm font-medium tabular-nums text-forest">
                        ₦{Number(donor.amount).toLocaleString()}
                      </Span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        ) : (
          <P className="text-ink/60 md:text-sm">Be the first to donate.</P>
        )}
      </div>

      {followed ? (
        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-forest/30 bg-forest/10 px-4 py-3 text-sm font-semibold text-forest">
          <CheckCheck className="h-4 w-4" />
          Following this campaign
        </div>
      ) : (
        <Button
          type="button"
          variant="ink"
          onClick={handleFollow}
          disabled={isPending}
          className="mt-5 h-11 w-full rounded-xl"
        >
          <Bell className="mr-2 h-3.5 w-3.5" />
          {isPending ? "Following..." : "Follow campaign"}
        </Button>
      )}

      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to follow</DialogTitle>
            <DialogDescription>
              Create a free account or sign in to follow this campaign and
              receive updates when milestones are reached.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            <Button
              variant="ink"
              className="w-full rounded-full"
              onClick={() => {
                setShowLoginModal(false);
                window.location.href = `/login?redirect=${encodeURIComponent(causePath)}`;
              }}
            >
              Sign in
            </Button>
            <Button
              variant="surface"
              className="w-full rounded-full"
              onClick={() => {
                setShowLoginModal(false);
                window.location.href = `/register?redirect=${encodeURIComponent(causePath)}`;
              }}
            >
              Create account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSupportModal} onOpenChange={setShowSupportModal}>
        <DialogContent className="border-0 bg-transparent p-0 shadow-none sm:max-w-2xl">
          <SupportErrorCta
            compact
            title="We couldn't follow this campaign"
            description="For customer support, follow us on X and join our Telegram community. Our team can help you there."
            errorMessage={followError}
            onRetry={() => {
              setShowSupportModal(false);
              handleFollow();
            }}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
