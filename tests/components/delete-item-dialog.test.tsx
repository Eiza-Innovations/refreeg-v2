import { fireEvent, render, screen } from "@testing-library/react";
import { DeleteItemDialog } from "@/components/dashboard/DeleteItemDialog";

function setup(pending = false) {
  const onConfirm = jest.fn();
  render(
    <DeleteItemDialog
      noun="campaign"
      open
      onOpenChange={jest.fn()}
      pending={pending}
      onConfirm={onConfirm}
    />,
  );
  return onConfirm;
}

describe("DeleteItemDialog", () => {
  it("names the item and confirms on click", () => {
    const onConfirm = setup();

    expect(screen.getByText("Delete this campaign?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete campaign" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("locks the buttons while deleting", () => {
    setup(true);

    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
