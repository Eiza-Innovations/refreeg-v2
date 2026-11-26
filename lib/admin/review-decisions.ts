import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const REVIEW_APPROVED = "review_approved";
export const REVIEW_REJECTED = "review_rejected";

/** Logs an approve/reject so review analytics know when the decision happened. */
export function recordReviewDecision(input: {
  actorId: string;
  kind: "cause" | "petition";
  targetId: string;
  decision: "approved" | "rejected";
  editReview: boolean;
}) {
  return prisma.admin_audit_entries
    .create({
      data: {
        id: randomUUID(),
        actor_id: input.actorId,
        kind: input.kind,
        target_id: input.targetId,
        action:
          input.decision === "approved" ? REVIEW_APPROVED : REVIEW_REJECTED,
        metadata: { editReview: input.editReview },
      },
    })
    .catch((error) => console.error("Review decision not logged:", error));
}
