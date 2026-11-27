import { organizationDetailsSchema } from "@/lib/schemas/organization-details.schema";

const base = {
  name: "QA Test Foundation",
  type: "ngo",
  registrationNumber: "RC 1234567",
  country: "Nigeria",
  ownerName: "Qa Tester",
  role: "Director",
  adminEmail: "qa@example.com",
  websiteUrl: "",
  username: "",
};

function phoneIssue(phone: string) {
  const result = organizationDetailsSchema.safeParse({ ...base, phone });
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === "phone")
    ?.message;
}

describe("organizationDetailsSchema phone", () => {
  it("accepts the number format used as the form's own placeholder", () => {
    expect(phoneIssue("+234 901 744 6760")).toBeUndefined();
  });

  it("accepts separators and brackets", () => {
    expect(phoneIssue("(0801) 234-5678")).toBeUndefined();
  });

  it("rejects too few or too many digits", () => {
    expect(phoneIssue("12")).toBe("Enter a valid phone number");
    expect(phoneIssue("+1234567890123456")).toBe("Enter a valid phone number");
  });

  it("rejects letters", () => {
    expect(phoneIssue("080abc12345")).toBe("Enter a valid phone number");
  });
});

describe("organizationDetailsSchema website", () => {
  const websiteIssue = (websiteUrl: string) => {
    const result = organizationDetailsSchema.safeParse({
      ...base,
      phone: "+234 901 744 6760",
      websiteUrl,
    });
    if (result.success) return undefined;
    return result.error.issues.find((issue) => issue.path[0] === "websiteUrl")
      ?.message;
  };

  it("accepts blank, bare domains and full URLs", () => {
    expect(websiteIssue("")).toBeUndefined();
    expect(websiteIssue("korahq.com")).toBeUndefined();
    expect(websiteIssue("https://korahq.com/about")).toBeUndefined();
  });

  it("flags text that cannot be a URL, as the server would", () => {
    expect(websiteIssue("not a url")).toBe(
      "Enter a valid website URL, like korahq.com",
    );
  });
});
