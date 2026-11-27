import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapPrismaToCause } from "@/lib/causes/map-cause";

/** A creator's causes, newest first, optionally limited to one status. */
export async function listUserCausesWithStatus(
  userId: string,
  status?: string,
) {
  const where: Prisma.CauseWhereInput = { userId };
  if (status && status !== "all") where.status = status;

  const causes = await prisma.cause.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return causes.map(mapPrismaToCause);
}
