jest.mock("@/lib/prisma", () => {
  const model = () => ({
    deleteMany: jest.fn(() => "op"),
    delete: jest.fn(() => "op"),
  });
  return {
    prisma: {
      petition_comments: model(),
      petition_sections: model(),
      signatures: model(),
      petition_edit_sections: model(),
      petition_edits: model(),
      petitions: model(),
      $transaction: jest.fn().mockResolvedValue([]),
    },
  };
});

import { prisma } from "@/lib/prisma";
import { removePetition } from "@/lib/petitions/remove-petition";

const db = prisma as unknown as Record<string, any>;

describe("removePetition", () => {
  it("deletes the dependents and the petition in one transaction", async () => {
    await removePetition("p1");

    expect(db.signatures.deleteMany).toHaveBeenCalledWith({
      where: { petition_id: "p1" },
    });
    expect(db.petitions.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.$transaction.mock.calls[0][0]).toHaveLength(6);
  });
});
