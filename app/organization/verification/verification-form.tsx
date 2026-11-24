"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FieldError } from "@/components/ui/field-error";
import { useValidator } from "@/hooks/use-validator";
import { toast } from "@/hooks/use-toast";
import { organizationVerificationSchema } from "@/lib/schemas/organization-verification.schema";
import { uploadVerificationDocument } from "@/lib/organization-verification-upload";
import { createOrganizationVerification } from "@/actions/users/organization-actions";

interface UploadedDoc {
  key: string;
  name: string;
}

interface VerificationFormProps {
  verificationStatus: string;
  submission: {
    status: string;
    note: string | null;
    submittedAt: string;
  } | null;
}

function DocUploader({
  label,
  description,
  docs,
  multiple,
  isUploading,
  setIsUploading,
  onAdd,
  onRemove,
  inputLabel,
}: {
  label: string;
  description: string;
  docs: UploadedDoc[];
  multiple: boolean;
  isUploading: boolean;
  setIsUploading: (value: boolean) => void;
  onAdd: (doc: UploadedDoc) => void;
  onRemove: (key: string) => void;
  inputLabel: string;
}) {
  return (
    <Card variant="surface" className="p-6 sm:p-8">
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1 text-sm text-ink/60">{description}</p>
      {docs.length ? (
        <div className="mt-3 space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.key}
              className="flex items-center justify-between rounded-lg border border-hairline bg-bone px-4 py-3"
            >
              <p className="truncate text-sm font-medium text-ink">
                {doc.name}
              </p>
              <button
                type="button"
                onClick={() => onRemove(doc.key)}
                aria-label={`Remove ${doc.name}`}
                className="text-ink/40 transition-colors hover:text-rust"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {multiple || !docs.length ? (
        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink/30 px-4 py-8 text-sm text-ink/60 transition-colors hover:border-ink/60">
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
          <span>{inputLabel}</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                handleDocUpload(file, onAdd, setIsUploading);
              }
              event.target.value = "";
            }}
          />
        </label>
      ) : null}
    </Card>
  );
}

async function handleDocUpload(
  file: File,
  onAdd: (doc: UploadedDoc) => void,
  setUploading: (value: boolean) => void,
) {
  setUploading(true);
  try {
    const result = await uploadVerificationDocument(file);
    if (!result.success) {
      toast({
        title: "Upload failed",
        description: result.error,
        variant: "destructive",
      });
      return;
    }
    onAdd({ key: result.key, name: file.name });
  } finally {
    setUploading(false);
  }
}

export function VerificationForm({
  verificationStatus,
  submission,
}: VerificationFormProps) {
  const router = useRouter();
  const [registrationDoc, setRegistrationDoc] = useState<UploadedDoc | null>(
    null,
  );
  const [directorDocs, setDirectorDocs] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = {
    registrationDocKey: registrationDoc?.key || "",
    directorIdKeys: directorDocs.map((doc) => doc.key),
  };
  const { errors, validate } = useValidator({
    store: form,
    schema: organizationVerificationSchema,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const result = await createOrganizationVerification({
        registrationDocKey: form.registrationDocKey,
        directorIdKeys: form.directorIdKeys,
      });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Documents submitted",
        description: "We will email you when the review is done.",
      });
      router.push("/onboarding");
    },
    onError: (error) =>
      toast({
        title: "Could not submit documents",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      }),
  });

  const handleSubmit = () => {
    if (!validate()) return;
    if (submitMutation.isPending || isUploading) return;
    submitMutation.mutate();
  };

  if (verificationStatus === "approved") {
    return (
      <CalloutBanner
        className="mt-8"
        variant="lime"
        title="This organisation is verified."
        description="Payouts and CSR giving are unlocked."
        action={
          <Link href="/dashboard" className="underline font-medium">
            Go to dashboard
          </Link>
        }
      />
    );
  }

  if (verificationStatus === "pending") {
    return (
      <CalloutBanner
        className="mt-8"
        variant="gold"
        title="Your documents are under review."
        description="Verification takes about 2 working days. We will email you when the review is done."
        action={
          <Link href="/onboarding" className="underline font-medium">
            Back to setup checklist
          </Link>
        }
      />
    );
  }

  const rejected = verificationStatus === "rejected";

  return (
    <div className="mt-8 space-y-6">
      {rejected ? (
        <CalloutBanner
          variant="rust"
          title="Your last submission was rejected."
          description={
            submission?.note ||
            "Check that names and numbers match your registration documents, then upload again."
          }
        />
      ) : null}

      <DocUploader
        label="CAC registration document"
        description="Certificate of incorporation or registration. PDF or image, up to 10 MB."
        docs={registrationDoc ? [registrationDoc] : []}
        multiple={false}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
        inputLabel="Click to upload"
        onAdd={setRegistrationDoc}
        onRemove={() => setRegistrationDoc(null)}
      />
      <FieldError message={errors.registrationDocKey} />

      <DocUploader
        label="Director IDs"
        description="A valid ID for at least one director. Up to five, PDF or image."
        docs={directorDocs}
        multiple
        isUploading={isUploading}
        setIsUploading={setIsUploading}
        inputLabel="Add a director ID"
        onAdd={(doc) => setDirectorDocs((prev) => [...prev, doc])}
        onRemove={(key) =>
          setDirectorDocs((prev) => prev.filter((item) => item.key !== key))
        }
      />
      <FieldError message={errors.directorIdKeys} />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ink"
          onClick={handleSubmit}
          disabled={submitMutation.isPending || isUploading}
          className="h-12 px-10"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit for review"
          )}
        </Button>
        <Link
          href="/onboarding"
          className="text-sm font-medium text-ink/60 transition-colors hover:text-ink"
        >
          Back to checklist
        </Link>
      </div>
    </div>
  );
}
