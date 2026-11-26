import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Petition } from "@/types";

/** A creator's petitions, newest first, optionally limited to one status. */
export async function listUserPetitionsWithStatus(
  userId: string,
  status?: string,
): Promise<Petition[]> {
  const where: Prisma.petitionsWhereInput = { user_id: userId };
  if (status && status !== "all") where.status = status;

  const petitions = await prisma.petitions.findMany({
    where,
    orderBy: { created_at: "desc" },
  });
  return petitions.map((petition) => ({
    ...petition,
    goal: Number(petition.goal),
    raised: Number(petition.raised),
    created_at: petition.created_at.toISOString(),
    updated_at: petition.updated_at.toISOString(),
  })) as unknown as Petition[];
}
