import type { Signature } from "@/types";
import type { Comment } from "@/types/common-types";

/** Turns signatures that carry a message into comments for the petition thread. */
export function signerComments(
  petitionId: string,
  signers: Signature[],
): Comment[] {
  return signers
    .filter((signer) => signer.message?.trim())
    .map((signer) => ({
      id: `signer-${signer.id}`,
      cause_id: petitionId,
      user_id: signer.user_id || "anonymous",
      content: signer.message ?? "",
      created_at: signer.created_at,
      updated_at: signer.created_at,
      is_edited: false,
      parent_id: null,
      user: { full_name: signer.name || "Anonymous", profile_photo: null },
      replies: [],
      replies_count: 0,
    }));
}
