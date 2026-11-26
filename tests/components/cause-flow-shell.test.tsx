import { fireEvent, render, screen, within } from "@testing-library/react";
import { CauseWizard } from "@/app/dashboard/causes/_components/cause-wizard";
import { createCauseStepMeta } from "@/lib/options/cause.options";

describe("RefreeG campaign wizard", () => {
  it("shows the active step and allows returning only to completed steps", () => {
    const onStepSelect = jest.fn();
    render(
      <CauseWizard
        title="Create a campaign"
        stepMeta={createCauseStepMeta}
        currentStep={2}
        onStepSelect={onStepSelect}
        onBack={jest.fn()}
        onNext={jest.fn()}
        onSubmit={jest.fn()}
        submitLabel="Send for review"
        busyLabel="Sending…"
        busy={false}
      >
        <div>Story fields</div>
      </CauseWizard>,
    );

    expect(
      screen.getByRole("heading", { name: "Title and story" }),
    ).toBeInTheDocument();
    const navigation = within(
      screen.getByRole("navigation", { name: "Create a campaign" }),
    );
    expect(navigation.getByText("Story").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(navigation.getByText("Target").closest("button")).toBeNull();
    fireEvent.click(
      navigation.getByRole("button", { name: "Go back to Cause" }),
    );
    expect(onStepSelect).toHaveBeenCalledWith(1);
  });
});
