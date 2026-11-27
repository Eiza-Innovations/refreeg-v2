/**
 * Inserts a handful of bounties against real, existing causes so the admin
 * review queue (/dashboard/admin/bounties) has something to review. There is
 * no owner-facing submission flow live yet, so this is how rows get into the
 * table until that exists. Safe to run more than once — skips causes that
 * already have a seeded bounty.
 *
 * Usage: npx tsx scripts/db/seed-sample-bounties.ts
 */
import { prisma } from "@/lib/prisma";

const SAMPLE_BOUNTIES = [
  {
    title: "Create a 60-second campaign video",
    category: "content",
    description:
      "Create a short vertical video that explains why this campaign needs support.",
    deliverable: "One edited MP4 video, source footage and a social caption.",
    reward: 25000,
    available_spots: 3,
    deadline: new Date("2026-12-18"),
  },
  {
    title: "Recruit five outreach volunteers",
    category: "outreach",
    description:
      "Help coordinate volunteers for the campaign's next community event.",
    deliverable: "A confirmed list of five volunteers and their availability.",
    reward: 12000,
    available_spots: 2,
    deadline: new Date("2026-12-10"),
  },
  {
    title: "Document three beneficiary stories",
    category: "content",
    description:
      "Interview beneficiaries and document how the campaign supports their households.",
    deliverable: "Three approved written stories with portrait photographs.",
    reward: 18000,
    available_spots: 3,
    deadline: new Date("2026-12-28"),
  },
];

async function main() {
  const causes = await prisma.cause.findMany({
    where: { status: "approved" },
    select: { id: true, userId: true, title: true },
    take: SAMPLE_BOUNTIES.length,
    orderBy: { createdAt: "desc" },
  });

  if (causes.length === 0) {
    console.log("No approved causes found — nothing to seed against.");
    return;
  }

  for (const [index, cause] of causes.entries()) {
    const sample = SAMPLE_BOUNTIES[index % SAMPLE_BOUNTIES.length];
    const existing = await prisma.bounties.findFirst({
      where: { cause_id: cause.id, title: sample.title },
    });
    if (existing) {
      console.log(
        `Skipping "${sample.title}" — already seeded for ${cause.title}`,
      );
      continue;
    }

    await prisma.bounties.create({
      data: {
        ...sample,
        cause_id: cause.id,
        owner_id: cause.userId,
        status: "in-review",
        submitted_at: new Date(),
      },
    });
    console.log(`Seeded "${sample.title}" for ${cause.title}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
