import {
  clearOnboardingStorage,
  hasConfirmedStep1,
  markStep1Confirmed,
  saveOnboardingAnswer,
} from "@/lib/onboarding/storage";

describe("onboarding storage", () => {
  beforeEach(() => localStorage.clear());

  it("keeps answers under one shared prefix", () => {
    saveOnboardingAnswer("gender", "female");

    expect(localStorage.getItem("onboarding_gender")).toBe("female");
  });

  it("remembers that step 1 was confirmed", () => {
    expect(hasConfirmedStep1()).toBe(false);

    markStep1Confirmed();

    expect(hasConfirmedStep1()).toBe(true);
  });

  it("clears every answer, including the step 1 marker", () => {
    saveOnboardingAnswer("gender", "female");
    saveOnboardingAnswer("interests", "[]");
    markStep1Confirmed();
    localStorage.setItem("unrelated", "keep me");

    clearOnboardingStorage();

    expect(localStorage.getItem("onboarding_gender")).toBeNull();
    expect(localStorage.getItem("onboarding_interests")).toBeNull();
    expect(hasConfirmedStep1()).toBe(false);
    expect(localStorage.getItem("unrelated")).toBe("keep me");
  });

  it("treats unreadable storage as 'not confirmed' instead of throwing", () => {
    const spy = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });

    expect(hasConfirmedStep1()).toBe(false);

    spy.mockRestore();
  });
});
