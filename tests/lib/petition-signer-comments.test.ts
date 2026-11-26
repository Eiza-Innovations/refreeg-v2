import { signerComments } from "@/lib/petitions/signer-comments";
import type { Signature } from "@/types";

const signer = (overrides: Partial<Signature>): Signature => ({
  id: "s1",
  petition_id: "p1",
  user_id: "u1",
  amount: 1,
  name: "Jane",
  email: "jane@example.com",
  message: "Count me in",
  is_anonymous: false,
  status: "signed",
  receipt_url: null,
  created_at: "2026-11-26T10:00:00.000Z",
  ...overrides,
});

describe("signerComments", () => {
  it("turns signatures with a message into comments", () => {
    const [comment] = signerComments("p1", [signer({})]);
    expect(comment).toMatchObject({
      id: "signer-s1",
      cause_id: "p1",
      content: "Count me in",
      user: { full_name: "Jane" },
    });
  });

  it("skips blank messages and names anonymous signers", () => {
    const comments = signerComments("p1", [
      signer({ id: "s2", message: "   " }),
      signer({ id: "s3", name: "", user_id: null }),
    ]);
    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({
      user_id: "anonymous",
      user: { full_name: "Anonymous" },
    });
  });
});
