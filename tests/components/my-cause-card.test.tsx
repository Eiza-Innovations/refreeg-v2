import { render, screen } from "@testing-library/react";
import { MyCauseCard } from "@/components/causes/MyCauseCard";

jest.mock("@/components/causes/CauseDropdown", () => ({
  CauseDropdown: () => <button>menu</button>,
}));

const cause: Parameters<typeof MyCauseCard>[0]["cause"] = {
  id: "c1",
  slug: "school-library",
  title: "School library",
  description: "Books for pupils",
  category: "Education",
  status: "approved",
  goal: 2000000,
  raised: 500000,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-11-20T00:00:00.000Z",
  rejection_reason: null,
};

describe("MyCauseCard", () => {
  it("links an active campaign to its analytics", () => {
    render(<MyCauseCard cause={cause} />);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /View analytics/ }),
    ).toHaveAttribute("href", "/dashboard/causes/c1/analytics");
  });

  it("shows a suspended notice instead of an action", () => {
    render(<MyCauseCard cause={{ ...cause, compliance_paused: true }} />);

    expect(screen.getByText("Suspended")).toBeInTheDocument();
    expect(screen.getByText("Campaign suspended")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /analytics/ })).toBeNull();
  });

  it("shows the reviewer note and a revise link when rejected", () => {
    render(
      <MyCauseCard
        cause={{
          ...cause,
          status: "rejected",
          rejection_reason: "Add proof of registration.",
        }}
      />,
    );

    expect(screen.getByText("Needs revision")).toBeInTheDocument();
    expect(screen.getByText("Add proof of registration.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Revise and resubmit/ }),
    ).toHaveAttribute("href", "/dashboard/causes/c1/edit");
  });
});
