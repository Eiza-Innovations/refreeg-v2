import { prisma } from "@/lib/prisma";

/**
 * Deletes a petition and everything attached to it in one transaction.
 * The schema has no cascade on these relations, so the rows go first.
 * The caller must already have checked ownership.
 */
export async function removePetition(petitionId: string) {
  await prisma.$transaction([
    prisma.petition_comments.deleteMany({ where: { petition_id: petitionId } }),
    prisma.petition_sections.deleteMany({ where: { petition_id: petitionId } }),
    prisma.signatures.deleteMany({ where: { petition_id: petitionId } }),
    prisma.petition_edit_sections.deleteMany({
      where: { petition_edit: { original_petition_id: petitionId } },
    }),
    prisma.petition_edits.deleteMany({
      where: { original_petition_id: petitionId },
    }),
    prisma.petitions.delete({ where: { id: petitionId } }),
  ]);
}
