import { prisma } from "@/lib/prisma";

/** Thrown when a campaign cannot be removed, with a message fit to show. */
export class CauseDeleteBlockedError extends Error {}

/**
 * Deletes a campaign and its drafts, comments and follows in one transaction.
 * A campaign that received money is never deleted. The caller must already
 * have checked ownership.
 */
export async function removeCause(causeId: string) {
  await prisma.$transaction(async (tx) => {
    const [donations, cryptoDonations] = await Promise.all([
      tx.donation.count({ where: { causeId } }),
      tx.crypto_donations.count({ where: { cause_id: causeId } }),
    ]);
    if (donations + cryptoDonations > 0) {
      throw new CauseDeleteBlockedError(
        "This campaign has received donations, so it can't be deleted. Contact support if it needs to be removed.",
      );
    }

    await tx.comments.deleteMany({ where: { cause_id: causeId } });
    await tx.campaign_follows.deleteMany({ where: { cause_id: causeId } });
    await tx.cause_shares.deleteMany({ where: { cause_id: causeId } });
    await tx.cause_sections.deleteMany({ where: { cause_id: causeId } });
    await tx.cause_edit_sections.deleteMany({
      where: { cause_edit: { original_cause_id: causeId } },
    });
    await tx.cause_edits.deleteMany({ where: { original_cause_id: causeId } });
    await tx.cause.delete({ where: { id: causeId } });
  });
}
