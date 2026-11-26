import { FileSignature } from "lucide-react";
import { MyItemsEmptyState } from "@/components/dashboard/MyItemsEmptyState";
import { MyPetitionCard } from "@/components/petitions/MyPetitionCard";
import { listUserPetitionsWithStatus } from "@/lib/petitions/user-petitions";
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
  const petitions = await listUserPetitionsWithStatus(userId, status);
  const totals = await getPetitionSignatureTotals(petitions.map((p) => p.id));

  if (petitions.length === 0) {
    return (
      <MyItemsEmptyState
        icon={<FileSignature className="h-6 w-6 text-ink/60" />}
        title="No petitions here"
        description={emptyCopy[status] ?? emptyCopy.all}
        createHref="/dashboard/petitions/create"
        createLabel="Start a petition"
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
