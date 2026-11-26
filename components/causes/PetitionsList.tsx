import { getRankedPetitions } from "@/lib/causes/petitions-ranked";
import { PaginationButton } from "@/components/engagement/PaginationButton";
import { EmptyState } from "@/components/ui/empty-state";
import { PetitionCard } from "@/components/petitions/PetitionCard";

interface PetitionsListProps {
  category: string;
  page: number;
  pageSize: number;
}

export async function PetitionsList({
  category,
  page,
  pageSize,
}: PetitionsListProps) {
  const sortedPetitions = await getRankedPetitions(category);

  const totalPetitions = sortedPetitions.length;
  const totalPages = Math.ceil(totalPetitions / pageSize);
  const paginatedPetitions = sortedPetitions.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  if (paginatedPetitions.length === 0) {
    return (
      <EmptyState
        title="No petitions found"
        description="Try selecting a different category or check back later."
      />
    );
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paginatedPetitions.map((petition) => (
          <PetitionCard
            key={petition.id}
            id={petition.id}
            title={petition.title}
            percent={petition.percentRaised}
            signatures={petition.totalAmount}
            goal={petition.goal}
            organiser={petition.profiles?.full_name || "Unknown organiser"}
            daysLeft={petition.days_active}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center pt-8">
          <PaginationButton currentPage={page} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
