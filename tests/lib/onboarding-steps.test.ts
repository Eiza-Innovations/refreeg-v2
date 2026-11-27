import {
  dbStepToStepId,
  resumeStepId,
  individualSteps,
  organizationSteps,
} from "@/lib/onboarding/steps";
import { clearOnboardingStorage } from "@/lib/onboarding/storage";
import { onboardingProfileSchema } from "@/lib/schemas/onboarding-profile.schema";

describe("onboarding steps", () => {
  it("skips CSR setup for fundraising organisations", () => {
    expect(organizationSteps("fundraising")).toEqual([
      "account-type",
      "org-details",
      "checklist",
    ]);
    expect(organizationSteps("csr")).toContain("csr-setup");
  });

  it("resumes individuals on the step they reached", () => {
    expect(dbStepToStepId(1, "individual")).toBe("account-type");
    expect(dbStepToStepId(2, "individual")).toBe("gender");
    expect(dbStepToStepId(3, "individual")).toBe("profile");
    expect(dbStepToStepId(4, "individual")).toBe("kyc");
    expect(individualSteps[individualSteps.length - 1]).toBe("complete");
  });

  it("resumes organisations on details, CSR or the checklist", () => {
    expect(dbStepToStepId(3.5, "organization")).toBe("org-details");
    expect(dbStepToStepId(3.6, "organization")).toBe("csr-setup");
    expect(dbStepToStepId(3.7, "organization")).toBe("checklist");
  });
});

describe("clearOnboardingStorage", () => {
  it("removes every saved onboarding answer", () => {
    localStorage.setItem("onboarding_gender", "female");
    localStorage.setItem("onboarding_profile", "{}");
    localStorage.setItem("unrelated", "keep");

    clearOnboardingStorage();

    expect(localStorage.getItem("onboarding_gender")).toBeNull();
    expect(localStorage.getItem("onboarding_profile")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });
});

describe("onboardingProfileSchema", () => {
  const valid = {
    firstName: "Ada",
    lastName: "Obi",
    username: "ada_obi",
    location: "Nigeria",
    phone: "+234 803 412 8890",
    consent: true,
  };

  it("accepts a complete profile", () => {
    expect(onboardingProfileSchema.safeParse(valid).success).toBe(true);
  });

  it("requires consent and a valid username and phone", () => {
    const result = onboardingProfileSchema.safeParse({
      ...valid,
      username: "a!",
      phone: "abc",
      consent: false,
    });
    const messages = result.success
      ? []
      : result.error.issues.map((issue) => issue.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        "Username must be at least 3 characters",
        "Please enter a valid phone number",
        "You must agree to the terms and conditions",
      ]),
    );
  });
});

describe("resumeStepId", () => {
  const base = {
    dbStep: 2,
    accountType: "individual",
    organizationPurpose: "",
    step1Confirmed: false,
  };

  it("shows step 1 to a newly registered individual, who sign-up already saved as step 2", () => {
    expect(resumeStepId(base)).toBe("account-type");
  });

  it("moves on to gender once step 1 has been confirmed", () => {
    expect(resumeStepId({ ...base, step1Confirmed: true })).toBe("gender");
  });

  it("does not send an individual further along back to step 1", () => {
    expect(resumeStepId({ ...base, dbStep: 3 })).toBe("profile");
    expect(resumeStepId({ ...base, dbStep: 4 })).toBe("kyc");
  });

  it("shows step 1 to a new organisation that has not chosen a purpose", () => {
    expect(
      resumeStepId({ ...base, accountType: "organization", dbStep: 3.5 }),
    ).toBe("account-type");
  });

  it("resumes an organisation that already chose its purpose", () => {
    expect(
      resumeStepId({
        ...base,
        accountType: "organization",
        organizationPurpose: "csr",
        dbStep: 3.5,
      }),
    ).toBe("org-details");
    expect(
      resumeStepId({
        ...base,
        accountType: "organization",
        organizationPurpose: "csr",
        dbStep: 3.6,
      }),
    ).toBe("csr-setup");
  });

  it("leaves an organisation that is past details alone even without a purpose", () => {
    expect(
      resumeStepId({ ...base, accountType: "organization", dbStep: 3.7 }),
    ).toBe("checklist");
  });
});
