"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CauseWizard } from "@/app/dashboard/causes/_components/cause-wizard";
import {
  WishlistNameStep,
  type WishlistDraft,
} from "@/components/wishlist/wishlist-name-step";
import { WishlistItemsStep } from "@/components/wishlist/wishlist-items-step";
import { useValidator } from "@/hooks/use-validator";
import { useWishlistItemRows } from "@/hooks/use-wishlist-item-rows";
import { toast } from "@/hooks/use-toast";
import {
  WISHLIST_ITEM_CAP,
  wishlistCreateSchema,
} from "@/lib/schemas/wishlist.schema";
import { saveWishlistWithItems } from "@/lib/wishlist/save-wishlist";
import { wishlistPublicPath } from "@/lib/wishlist/slug";

const WISHLIST_STEPS = [
  {
    title: "Name your wishlist",
    description: "This is the title givers see at the top of your page.",
  },
  {
    title: "Add your gifts",
    description: `Add up to ${WISHLIST_ITEM_CAP} items now, or start with one and add the rest any time later.`,
  },
] as const;

export function CreateWishlistForm({
  seasonal,
  username,
}: {
  seasonal: boolean;
  username: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<WishlistDraft>({
    title: "",
    message: "",
    isPublic: true,
  });
  const itemRows = useWishlistItemRows();
  const validator = useValidator({
    store: wishlist,
    schema: wishlistCreateSchema,
  });

  const goToItems = () => {
    setServerError(null);
    if (!validator.validate()) return;
    setStep(2);
  };

  const create = async () => {
    setServerError(null);

    if (itemRows.uploading) {
      setServerError("Wait for your photos to finish uploading.");
      return;
    }

    const rows = itemRows.validate();
    if (!rows) {
      if (itemRows.isEmpty) {
        setServerError("Add at least one item before creating your wishlist.");
      }
      return;
    }

    setSubmitting(true);
    try {
      const result = await saveWishlistWithItems({ ...wishlist, rows });
      if (!result.ok) {
        setServerError(result.error);
        setSubmitting(false);
        return;
      }
      if (result.notice) {
        toast({ title: "Wishlist created", description: result.notice });
      }
      router.push(
        wishlistPublicPath({ ownerUsername: username, slug: result.slug }),
      );
    } catch {
      setServerError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <CauseWizard
      eyebrow="Wishlist builder"
      title="Create your wishlist"
      // description="Name it, list the gifts, and share one link."
      stepMeta={WISHLIST_STEPS}
      stepperLabels={["Name it", "Add gifts"]}
      headerBadge="Bank payout protected"
      currentStep={step}
      onStepSelect={(target) => {
        if (target < step) setStep(1);
      }}
      onBack={() => setStep(1)}
      onNext={goToItems}
      onSubmit={create}
      submitLabel="Create wishlist"
      busyLabel="Creating…"
      busy={submitting}
      submitError={serverError}
    >
      {step === 1 ? (
        <WishlistNameStep
          wishlist={wishlist}
          errors={validator.errors}
          seasonal={seasonal}
          username={username}
          onChange={(patch) => setWishlist((w) => ({ ...w, ...patch }))}
        />
      ) : (
        <WishlistItemsStep title={wishlist.title} itemRows={itemRows} />
      )}
    </CauseWizard>
  );
}
