import Link from "next/link";
import { FileSignature, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MyPetitionCard } from "@/components/petitions/MyPetitionCard";
import { getUserPetitionsWithStatus } from "@/actions/petitions/petition-actions";
import { getPetitionSignatureTotals } from "@/actions/petitions/signature-actions";

const emptyCopy: Record<string, string> = {
  all: "You haven't created any petitions yet.",
  approved: "You don't have any live petitions.",
  pending: "You don't have any petitions under review.",
  rejected: "You don't have any petitions that need revision.",
};

export async function MyPetitionsList({
  status,
  userId,
}: {
  status: string;
  userId: string;
}) {
  const petitions = await getUserPetitionsWithStatus(userId, status);
  const totals = await getPetitionSignatureTotals(petitions.map((p) => p.id));

  if (petitions.length === 0) {
    return (
      <EmptyState
        icon={<FileSignature className="h-6 w-6 text-ink/60" />}
        title="No petitions here"
        description={emptyCopy[status] ?? emptyCopy.all}
        action={
          <Button asChild variant="ink" className="rounded-xl">
            <Link href="/dashboard/petitions/create">
              <Plus className="mr-2 h-4 w-4" />
              Start a petition
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {petitions.map((petition) => (
        <MyPetitionCard
          key={petition.id}
          petition={{
            ...petition,
            signatures: totals[petition.id]?.signerCount ?? 0,
          }}
        />
      ))}
    </div>
  );
}
