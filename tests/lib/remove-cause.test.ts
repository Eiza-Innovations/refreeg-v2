jest.mock("@/lib/prisma", () => ({
  prisma: { $transaction: jest.fn() },
}));

import { prisma } from "@/lib/prisma";
import {
  CauseDeleteBlockedError,
  removeCause,
} from "@/lib/causes/remove-cause";

const model = () => ({
  deleteMany: jest.fn(),
  delete: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
});

function setup() {
  const tx = {
    donation: model(),
    crypto_donations: model(),
    comments: model(),
    campaign_follows: model(),
    cause_shares: model(),
    cause_sections: model(),
    cause_edit_sections: model(),
    cause_edits: model(),
    cause: model(),
  };
  (prisma.$transaction as jest.Mock).mockImplementation((run) => run(tx));
  return tx;
}

describe("removeCause", () => {
  it("deletes an unfunded campaign and its dependents", async () => {
    const tx = setup();

    await removeCause("c1");

    expect(tx.comments.deleteMany).toHaveBeenCalledWith({
      where: { cause_id: "c1" },
    });
    expect(tx.cause.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("refuses a campaign that received donations", async () => {
    const tx = setup();
    tx.donation.count.mockResolvedValue(2);

    await expect(removeCause("c1")).rejects.toBeInstanceOf(
      CauseDeleteBlockedError,
    );
    expect(tx.cause.delete).not.toHaveBeenCalled();
  });

  it("refuses a campaign that received crypto donations", async () => {
    const tx = setup();
    tx.crypto_donations.count.mockResolvedValue(1);

    await expect(removeCause("c1")).rejects.toBeInstanceOf(
      CauseDeleteBlockedError,
    );
    expect(tx.cause.delete).not.toHaveBeenCalled();
  });
});
