import { prisma } from "@/lib/prisma";

export async function isSessionInvalidated(
  userId: string,
  sessionIssuedAt: number | undefined,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      sessions_invalidated_after: true,
      isBlocked: true,
    },
  });

  if (!user || user.isBlocked) return true;
  if (!sessionIssuedAt || !user.sessions_invalidated_after) return false;

  return sessionIssuedAt < user.sessions_invalidated_after.getTime();
}
