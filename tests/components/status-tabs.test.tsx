import { render, screen } from "@testing-library/react";
import { StatusTabs } from "@/components/dashboard/StatusTabs";

const options = [
  { label: "All", value: "all" },
  { label: "Active", value: "approved" },
  { label: "Needs revision", value: "rejected" },
] as const;

describe("StatusTabs", () => {
  beforeEach(() => {
    Element.prototype.scrollTo = jest.fn();
  });

  it("links each status through the URL", () => {
    render(
      <StatusTabs
        options={options}
        status="approved"
        basePath="/dashboard/causes"
      />,
    );

    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute(
      "href",
      "/dashboard/causes",
    );
    expect(screen.getByRole("tab", { name: "Needs revision" })).toHaveAttribute(
      "href",
      "/dashboard/causes?status=rejected",
    );
  });

  it("marks the current status and scrolls it into view", () => {
    render(
      <StatusTabs
        options={options}
        status="rejected"
        basePath="/dashboard/causes"
      />,
    );

    expect(screen.getByRole("tab", { name: "Needs revision" })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(Element.prototype.scrollTo).toHaveBeenCalled();
  });
});
