import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useProfileStepForm } from "@/hooks/use-profile-step-form";
import { uploadFileWithPresign } from "@/lib/s3/upload-client";
import type { OnboardingData, OnboardingUser } from "@/types/onboarding-types";

let mockUsername = "available" as "available" | "taken" | "idle";
jest.mock("@/hooks/use-username-availability", () => ({
  useUsernameAvailability: () => mockUsername,
}));
jest.mock("@/lib/s3/upload-client", () => ({
  uploadFileWithPresign: jest.fn(),
}));
jest.mock("@/utils/image-compression", () => ({
  compressImage: jest.fn(async (file: File) => file),
}));

const mockUploadFileWithPresign = uploadFileWithPresign as jest.Mock;

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

function setup(overrides?: {
  user?: OnboardingUser;
  onboardingData?: OnboardingData;
}) {
  const onNext = jest.fn();
  const updateOnboardingData = jest.fn();
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () =>
      useProfileStepForm({
        user: overrides?.user ?? user,
        onboardingData: overrides?.onboardingData ?? data,
        updateOnboardingData,
        onNext,
      }),
    { wrapper },
  );
  return { ...hook, onNext, updateOnboardingData };
}

describe("useProfileStepForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsername = "available";
    global.URL.createObjectURL = jest.fn(() => "blob:http://localhost/preview");
    global.URL.revokeObjectURL = jest.fn();
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

  it("requires a profile photo when the account has no avatar", () => {
    const { result, onNext } = setup({
      user: { ...user, image: null },
    });
    act(() => result.current.setFormFields("location", "Nigeria"));
    act(() => result.current.setFormFields("phone", "+2348034128890"));
    act(() => result.current.setFormFields("consent", true));

    act(() => result.current.submit());

    expect(onNext).not.toHaveBeenCalled();
    expect(result.current.photoError).toBe("Profile photo is required");
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

  it("uploads a picked photo via presigned S3 PUT and submits only its S3 key", async () => {
    const s3Key = "uploads/profiles/u1/u1/images/avatar.jpg";
    mockUploadFileWithPresign.mockResolvedValueOnce({ key: s3Key });

    const { result, onNext, updateOnboardingData } = setup({
      user: { ...user, image: null },
    });
    const photo = new File(["image-bytes"], "avatar.jpg", {
      type: "image/jpeg",
    });

    act(() => result.current.pickPhoto(photo));

    await waitFor(() => expect(result.current.isUploadingPhoto).toBe(false));
    expect(mockUploadFileWithPresign).toHaveBeenCalledWith(photo, {
      entityType: "profiles",
      entityId: "u1",
      mediaType: "images",
    });
    expect(updateOnboardingData).toHaveBeenCalledWith(
      "profile",
      expect.objectContaining({ profilePhoto: s3Key }),
    );

    act(() => result.current.setFormFields("location", "Nigeria"));
    act(() => result.current.setFormFields("phone", "+2348034128890"));
    act(() => result.current.setFormFields("consent", true));
    act(() => result.current.submit());

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({
        profilePhoto: s3Key,
      }),
    );
  });

  it("surfaces the real S3 upload error and blocks submit when no prior photo exists", async () => {
    mockUploadFileWithPresign.mockRejectedValueOnce(
      new Error(
        "S3 upload failed (403). Check bucket CORS allows PUT from this origin.",
      ),
    );

    const { result, onNext } = setup({
      user: { ...user, image: null },
    });
    const photo = new File(["image-bytes"], "avatar.jpg", {
      type: "image/jpeg",
    });

    act(() => result.current.pickPhoto(photo));

    await waitFor(() =>
      expect(result.current.photoError).toBe(
        "S3 upload failed (403). Check bucket CORS allows PUT from this origin.",
      ),
    );

    act(() => result.current.setFormFields("location", "Nigeria"));
    act(() => result.current.setFormFields("phone", "+2348034128890"));
    act(() => result.current.setFormFields("consent", true));
    act(() => result.current.submit());

    expect(onNext).not.toHaveBeenCalled();
    expect(result.current.photoError).toBe(
      "S3 upload failed (403). Check bucket CORS allows PUT from this origin.",
    );
  });

  it("rejects a photo over 5MB", () => {
    const { result } = setup();
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", {
      type: "image/png",
    });

    act(() => result.current.pickPhoto(big));

    expect(result.current.photoError).toBe("File size must be less than 5MB");
    expect(mockUploadFileWithPresign).not.toHaveBeenCalled();
  });

  it("rejects a file that is not a supported raster image", () => {
    const { result } = setup();
    const text = new File(["hi"], "note.txt", { type: "text/plain" });
    const svg = new File(["<svg/>"], "icon.svg", { type: "image/svg+xml" });

    act(() => result.current.pickPhoto(text));
    expect(result.current.photoError).toBe("Please select an image file");

    act(() => result.current.pickPhoto(svg));
    expect(result.current.photoError).toBe("Please select an image file");
    expect(mockUploadFileWithPresign).not.toHaveBeenCalled();
  });
});
