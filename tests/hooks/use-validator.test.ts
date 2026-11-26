import { renderHook, act } from "@testing-library/react";
import { z } from "zod";
import { useValidator } from "@/hooks/use-validator";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  goal: z.string().min(1, "Goal is required"),
});

describe("useValidator", () => {
  it("shows every field error by default", () => {
    const { result } = renderHook(() =>
      useValidator({ store: { title: "", goal: "" }, schema }),
    );
    act(() => {
      result.current.validate();
    });
    expect(result.current.errors).toEqual({
      title: "Title is required",
      goal: "Goal is required",
    });
  });

  it("limits errors to the requested fields", () => {
    const { result } = renderHook(() =>
      useValidator({ store: { title: "", goal: "" }, schema }),
    );
    let valid = true;
    act(() => {
      valid = result.current.validate(["title"]);
    });
    expect(valid).toBe(false);
    expect(result.current.errors).toEqual({ title: "Title is required" });
  });

  it("passes when only other fields are invalid", () => {
    const { result } = renderHook(() =>
      useValidator({ store: { title: "Hi", goal: "" }, schema }),
    );
    let valid = false;
    act(() => {
      valid = result.current.validate(["title"]);
    });
    expect(valid).toBe(true);
    expect(result.current.errors).toEqual({});
  });
});
