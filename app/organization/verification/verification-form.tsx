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
import { P, Small, Span } from "@/components/marketing/Typography";
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
  redirectTo?: string;
}

interface VerificationFormStore {
  registrationDoc: UploadedDoc | null;
  statusReportDoc: UploadedDoc | null;
  memartDoc: UploadedDoc | null;
  scumlDoc: UploadedDoc | null;
  tinDoc: UploadedDoc | null;
  addressProofDoc: UploadedDoc | null;
  directorDocs: UploadedDoc[];
}

type SingleDocField =
  | "registrationDoc"
  | "statusReportDoc"
  | "memartDoc"
  | "scumlDoc"
  | "tinDoc"
  | "addressProofDoc";

const COMPANY_DOC_FIELDS: {
  field: SingleDocField;
  errorKey?: "registrationDocKey" | "statusReportDocKey";
  label: string;
  description: string;
  required?: boolean;
}[] = [
  {
    field: "registrationDoc",
    errorKey: "registrationDocKey",
    label: "CAC Certificate of Incorporation / Registration *",
    description:
      "Certificate of Incorporation (RC), Business Name (BN), or Incorporated Trustees (IT). PDF or image, up to 10 MB.",
    required: true,
  },
  {
    field: "statusReportDoc",
    errorKey: "statusReportDocKey",
    label: "CAC Status Report (or Form CAC 2 & 7) *",
    description:
      "Shows current directors/trustees, shareholders, and registered address. PDF or image, up to 10 MB.",
    required: true,
  },
  {
    field: "memartDoc",
    label: "MEMART / Constitution / Trust Deed (Optional)",
    description:
      "Memorandum & Articles of Association for limited companies, or Constitution/Trust Deed for NGOs.",
  },
  {
    field: "scumlDoc",
    label: "SCUML Certificate (Optional)",
    description:
      "Required in Nigeria for NGOs, Foundations, and regulated DNFIs (legal, real estate, accounting, consulting).",
  },
  {
    field: "tinDoc",
    label: "TIN Certificate (Optional)",
    description: "FIRS / NRS Tax Identification Number confirmation.",
  },
  {
    field: "addressProofDoc",
    label: "Proof of Business Address (Optional)",
    description:
      "Recent utility bill or tenancy agreement (within 3 months) if not shown on CAC Status Report.",
  },
];

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
      <P className="mt-1 text-ink/60 md:text-sm">{description}</P>
      {docs.length ? (
        <div className="mt-3 space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.key}
              className="flex items-center justify-between rounded-lg border border-hairline bg-bone px-4 py-3"
            >
              <Small className="truncate font-medium text-ink">
                {doc.name}
              </Small>
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
          <Span className="text-sm text-ink/60">{inputLabel}</Span>
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
  redirectTo = "/onboarding",
}: VerificationFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<VerificationFormStore>({
    registrationDoc: null,
    statusReportDoc: null,
    memartDoc: null,
    scumlDoc: null,
    tinDoc: null,
    addressProofDoc: null,
    directorDocs: [],
  });
  const [isUploading, setIsUploading] = useState(false);

  const setFormField = <K extends keyof VerificationFormStore>(
    key: K,
    value: VerificationFormStore[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const payload = {
    registrationDocKey: formState.registrationDoc?.key || "",
    statusReportDocKey: formState.statusReportDoc?.key || "",
    memartDocKey: formState.memartDoc?.key || "",
    scumlDocKey: formState.scumlDoc?.key || "",
    tinDocKey: formState.tinDoc?.key || "",
    addressProofDocKey: formState.addressProofDoc?.key || "",
    directorIdKeys: formState.directorDocs.map((doc) => doc.key),
  };

  const { errors, validate } = useValidator({
    store: payload,
    schema: organizationVerificationSchema,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const result = await createOrganizationVerification(payload);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Documents submitted",
        description: "We will email you when the manual review is done.",
      });
      router.push(redirectTo);
      router.refresh();
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
        description="Payouts, fundraising, and CSR giving are unlocked."
        action={
          <Link href="/dashboard" className="font-medium underline">
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
        description="Manual verification takes about 2 working days. We will email you when the review is done."
        action={
          <Link href={redirectTo} className="font-medium underline">
            {redirectTo === "/onboarding"
              ? "Back to setup checklist"
              : "Refresh status"}
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

      {COMPANY_DOC_FIELDS.map((item) => {
        const current = formState[item.field];
        return (
          <div key={item.field}>
            <DocUploader
              label={item.label}
              description={item.description}
              docs={current ? [current] : []}
              multiple={false}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
              inputLabel={
                item.required ? "Click to upload" : "Upload (optional)"
              }
              onAdd={(doc) => setFormField(item.field, doc)}
              onRemove={() => setFormField(item.field, null)}
            />
            {item.errorKey ? (
              <FieldError message={errors[item.errorKey]} />
            ) : null}
          </div>
        );
      })}

      <div>
        <DocUploader
          label="Directors / Trustees Government IDs *"
          description="Valid NIN, International Passport, Driver's License, or PVC for directors/trustees. Upload 1 to 5 files (PDF or image)."
          docs={formState.directorDocs}
          multiple
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          inputLabel="Add a director or trustee ID"
          onAdd={(doc) =>
            setFormField("directorDocs", [...formState.directorDocs, doc])
          }
          onRemove={(key) =>
            setFormField(
              "directorDocs",
              formState.directorDocs.filter((item) => item.key !== key),
            )
          }
        />
        <FieldError message={errors.directorIdKeys} />
      </div>

      {submitMutation.error ? (
        <FieldError message={submitMutation.error.message} />
      ) : null}

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
        {redirectTo === "/onboarding" ? (
          <Link
            href="/onboarding"
            className="text-sm font-medium text-ink/60 transition-colors hover:text-ink"
          >
            Back to checklist
          </Link>
        ) : null}
      </div>
    </div>
  );
}
