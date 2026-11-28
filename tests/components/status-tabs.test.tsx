import { fireEvent, render, screen } from "@testing-library/react";

const replace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import { StatusTabs } from "@/components/dashboard/StatusTabs";

const options = [
  { label: "All", value: "all" },
  { label: "Active", value: "approved" },
  { label: "Needs revision", value: "rejected" },
] as const;

describe("StatusTabs", () => {
  beforeEach(() => {
    replace.mockClear();
    Element.prototype.scrollTo = jest.fn();
  });

  it("routes each status through the URL without a full navigation", () => {
    render(
      <StatusTabs
        options={options}
        status="approved"
        basePath="/dashboard/causes"
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "All" }));
    expect(replace).toHaveBeenCalledWith("/dashboard/causes", {
      scroll: false,
    });

    fireEvent.click(screen.getByRole("tab", { name: "Needs revision" }));
    expect(replace).toHaveBeenCalledWith("/dashboard/causes?status=rejected", {
      scroll: false,
    });
  });

  it("ignores clicks on the tab that is already active", () => {
    render(
      <StatusTabs
        options={options}
        status="approved"
        basePath="/dashboard/causes"
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Active" }));
    expect(replace).not.toHaveBeenCalled();
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
