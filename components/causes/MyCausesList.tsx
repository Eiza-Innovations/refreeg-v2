import { Megaphone } from "lucide-react";
import { MyItemsEmptyState } from "@/components/dashboard/MyItemsEmptyState";
import { MyCauseCard } from "@/components/causes/MyCauseCard";
import { listUserCausesWithStatus } from "@/lib/causes/user-causes";

const emptyCopy: Record<string, string> = {
  all: "You haven't created any campaigns yet.",
  approved: "You don't have any active campaigns.",
  suspended:
    "You don't have any suspended campaigns. Great job keeping them compliant!",
  pending: "You don't have any campaigns under review.",
  rejected: "You don't have any campaigns that need revision.",
};

interface MyCausesListProps {
  status: string;
  userId: string;
}

export async function MyCausesList({ status, userId }: MyCausesListProps) {
  // Suspended campaigns are approved ones the compliance check has paused.
  const causes = await listUserCausesWithStatus(
    userId,
    status === "suspended" ? "approved" : status,
  );
  const shown =
    status === "all"
      ? causes
      : causes.filter(
          (cause) => !!cause.compliance_paused === (status === "suspended"),
        );

  if (shown.length === 0) {
    return (
      <MyItemsEmptyState
        icon={<Megaphone className="h-6 w-6 text-ink/60" />}
        title="No campaigns here"
        description={emptyCopy[status] ?? emptyCopy.all}
        createHref="/dashboard/causes/create"
        createLabel="Start a campaign"
      />
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {shown.map((cause) => (
        <MyCauseCard key={cause.id} cause={cause} />
      ))}
    </div>
  );
}
