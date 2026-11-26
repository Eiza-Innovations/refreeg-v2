import { getCreatorComplianceStatus } from "@/actions/causes/proof-update-actions";
import { ProofUploadDialog } from "./proof-upload-dialog";
import { AlertTriangle, Clock, PauseCircle } from "lucide-react";
import { CalloutBanner } from "@/components/ui/callout-banner";

export async function ProofComplianceBanner({ userId }: { userId: string }) {
  const requirements = await getCreatorComplianceStatus(userId);
  if (requirements.length === 0) return null;

  const byCause = new Map<
    string,
    {
      title: string;
      paused: boolean;
      pending: number[];
      submitted: number[];
    }
  >();

  for (const r of requirements) {
    const entry = byCause.get(r.cause.id) ?? {
      title: r.cause.title,
      paused: r.cause.compliance_paused,
      pending: [],
      submitted: [],
    };
    if (r.status === "pending") entry.pending.push(r.milestone);
    else entry.submitted.push(r.milestone);
    byCause.set(r.cause.id, entry);
  }

  const rowClass = "flex-col sm:flex-row sm:items-center";

  return (
    <div className="space-y-3">
      {Array.from(byCause.entries()).map(([causeId, c]) => {
        const earliestDeadline = requirements.find(
          (r) => r.cause.id === causeId && r.status === "pending",
        )?.deadline;
        const upload = (
          <ProofUploadDialog
            causeId={causeId}
            causeTitle={c.title}
            pendingMilestones={c.pending}
          />
        );

        if (c.paused) {
          return (
            <CalloutBanner
              key={causeId}
              variant="rust"
              className={rowClass}
              icon={<PauseCircle className="h-5 w-5 shrink-0 text-rust" />}
              title={`“${c.title}” is suspended`}
              description="It's hidden from the platform and not accepting donations. Submit your fund-use update. The campaign goes live again once it's approved."
              action={upload}
            />
          );
        }

        if (c.pending.length > 0) {
          return (
            <CalloutBanner
              key={causeId}
              variant="gold"
              className={rowClass}
              icon={<AlertTriangle className="h-5 w-5 shrink-0" />}
              title={`Action needed: “${c.title}” crossed ${c.pending.map((m) => `${m}%`).join(" and ")}`}
              description={`Post a fund-use update${earliestDeadline ? ` by ${new Date(earliestDeadline).toDateString()}` : ""} or the campaign will be paused and hidden.`}
              action={upload}
            />
          );
        }

        return (
          <CalloutBanner
            key={causeId}
            variant="blue"
            icon={<Clock className="h-5 w-5 shrink-0" />}
            title={`Update under review: “${c.title}”`}
            description={`Your ${c.submitted.map((m) => `${m}%`).join(" and ")} fund-use update is with our team. We'll email you when it's approved.`}
          />
        );
      })}
    </div>
  );
}
