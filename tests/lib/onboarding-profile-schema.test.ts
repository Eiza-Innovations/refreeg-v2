import { onboardingProfileSchema } from "@/lib/schemas/onboarding-profile.schema";

const valid = {
  firstName: "Ada",
  lastName: "Obi",
  username: "ada_obi",
  location: "Lagos",
  phone: "+234 801 234 5678",
  consent: true,
};

describe("onboardingProfileSchema names", () => {
  it("accepts ordinary names", () => {
    expect(onboardingProfileSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a name over 60 characters with a clear message", () => {
    const result = onboardingProfileSchema.safeParse({
      ...valid,
      lastName: "x".repeat(61),
    });
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0].message).toBe(
      "Last name must be 60 characters or fewer",
    );
  });
});
