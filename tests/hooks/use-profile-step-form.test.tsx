import { act, renderHook } from "@testing-library/react";
import { useProfileStepForm } from "@/hooks/use-profile-step-form";
import type { OnboardingData, OnboardingUser } from "@/types/onboarding-types";

let mockUsername = "available" as "available" | "taken" | "idle";
jest.mock("@/hooks/use-username-availability", () => ({
  useUsernameAvailability: () => mockUsername,
}));

const user = {
  id: "u1",
  name: "Ada Obi",
  email: "ada@example.com",
  image: "https://img.example/ada.png",
} as OnboardingUser;

const data: OnboardingData = {
  accountType: "individual",
  organizationPurpose: "",
  gender: "female",
  profile: {
    firstName: "",
    lastName: "",
    username: "",
    bio: "",
    location: "",
    website: "",
    phone: "",
  },
  interests: [],
  kycCompleted: false,
  consent: false,
};

function setup() {
  const onNext = jest.fn();
  const updateOnboardingData = jest.fn();
  const hook = renderHook(() =>
    useProfileStepForm({
      user,
      onboardingData: data,
      updateOnboardingData,
      onNext,
    }),
  );
  return { ...hook, onNext, updateOnboardingData };
}

describe("useProfileStepForm", () => {
  beforeEach(() => {
    mockUsername = "available";
  });

  it("starts from the session name and suggests a username", () => {
    const { result } = setup();

    expect(result.current.form.firstName).toBe("Ada");
    expect(result.current.form.lastName).toBe("Obi");
    expect(result.current.form.username).not.toBe("");
  });

  it("blocks a submit with missing fields and shows their errors", () => {
    const { result, onNext } = setup();

    act(() => result.current.submit());

    expect(onNext).not.toHaveBeenCalled();
    expect(result.current.errors.location).toBe("Location is required");
    expect(result.current.errors.phone).toBe("Phone number is required");
    expect(result.current.errors.consent).toBe(
      "You must agree to the terms and conditions",
    );
  });

  it("blocks a taken username", () => {
    mockUsername = "taken";
    const { result, onNext } = setup();
    act(() => result.current.setFormFields("location", "Nigeria"));
    act(() => result.current.setFormFields("phone", "+2348034128890"));
    act(() => result.current.setFormFields("consent", true));

    act(() => result.current.submit());

    expect(onNext).not.toHaveBeenCalled();
    expect(result.current.errors.username).toBe("Username is already taken");
  });

  it("passes the finished profile on, with the account email", () => {
    const { result, onNext } = setup();
    act(() => result.current.setFormFields("location", "Nigeria"));
    act(() => result.current.setFormFields("phone", "+2348034128890"));
    act(() => result.current.setFormFields("consent", true));

    act(() => result.current.submit());

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Ada",
        location: "Nigeria",
        email: "ada@example.com",
        profilePhoto: null,
      }),
    );
  });

  it("rejects a photo over 5MB", async () => {
    const { result } = setup();
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", {
      type: "image/png",
    });

    await act(async () => result.current.pickPhoto(big));

    expect(result.current.photoError).toBe("File size must be less than 5MB");
  });

  it("rejects a file that is not an image", async () => {
    const { result } = setup();
    const text = new File(["hi"], "note.txt", { type: "text/plain" });

    await act(async () => result.current.pickPhoto(text));

    expect(result.current.photoError).toBe("Please select an image file");
  });
});
