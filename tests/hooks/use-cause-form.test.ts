import { act, renderHook } from "@testing-library/react";
import { useCauseForm } from "@/hooks/use-cause-form";
import type { CauseFormValues } from "@/lib/schemas/cause.schema";

const initialValues: CauseFormValues = {
  title: "Valid title",
  summary: "",
  location: "Lagos",
  category: "community",
  goal: "1000",
  currency: "NGN",
  coverImage: null,
  image: "",
  sections: [
    { heading: "", description: "" },
    { heading: "", description: "" },
  ],
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-01-03"),
  multimedia: [],
  videoLinks: [],
};

it("validates each step and preserves errors for individual story sections", () => {
  const { result } = renderHook(() =>
    useCauseForm({ initialValues, mode: "create" }),
  );
  act(() => result.current.nextStep());
  expect(result.current.currentStep).toBe(2);
  act(() => result.current.nextStep());
  expect(result.current.currentStep).toBe(2);
  expect(result.current.errors.sections?.[1]).toEqual({
    heading: "Heading is required",
    description: "Sub-description is required",
  });
  act(() => result.current.updateSection(1, "heading", "Details"));
  expect(result.current.errors.sections?.[1]?.heading).toBeUndefined();
  expect(result.current.errors.sections?.[1]?.description).toBe(
    "Sub-description is required",
  );
  act(() => result.current.removeSection(0));
  expect(result.current.errors.sections?.[0]?.description).toBe(
    "Sub-description is required",
  );
});
