"use client";

import { useState } from "react";
import Image from "next/image";
import { Calendar, FileText, MapPin, Phone, User } from "lucide-react";
import { CalloutBanner } from "@/components/ui/callout-banner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Separator } from "@/components/ui/separator";
import { Small } from "@/components/marketing/Typography";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import type { KycLegacyDetailsCardProps } from "@/types/kyc-types";
import { KycDocumentPreviewDialog } from "./kyc-document-preview-dialog";

export function KycLegacyDetailsCard({ kycData }: KycLegacyDetailsCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const personalRows = [
    { icon: User, label: "Full name", value: kycData.full_name || "-" },
    { icon: Calendar, label: "Date of birth", value: kycData.dob || "-" },
    { icon: Phone, label: "Phone", value: kycData.phone || "-" },
  ];

  const addressRows = [
    { label: "Address", value: kycData.address || "-" },
    {
      label: "City / State",
      value: [kycData.city, kycData.state].filter(Boolean).join(", ") || "-",
    },
    {
      label: "Postal / Country",
      value:
        [kycData.postal, kycData.country].filter(Boolean).join(", ") || "-",
    },
  ];

  const resolvedDocUrl = getMediaUrl(kycData.document_url);
  const isPdf = kycData.document_url?.toLowerCase().endsWith(".pdf");

  return (
    <Card variant="surface" className="rounded-2xl shadow-none">
      <CardHeader className="border-b border-hairline pb-4">
        <Eyebrow>Archive</Eyebrow>
        <CardTitle className="flex items-center gap-2 text-base text-ink">
          <FileText className="h-4 w-4 text-ink/55" />
          Legacy submission details
        </CardTitle>
        <CardDescription>
          Information provided via manual upload
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <Eyebrow className="text-ink/50">Personal information</Eyebrow>
            <div className="space-y-3">
              {personalRows.map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.label} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-ink/45" />
                    <span className="w-28 text-sm font-medium text-ink/60">
                      {row.label}
                    </span>
                    <span className="text-sm text-ink">{row.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <Eyebrow className="text-ink/50">Address information</Eyebrow>
            <div className="space-y-3">
              {addressRows.map((row, index) => (
                <div key={row.label} className="flex items-center gap-3">
                  <MapPin
                    className={
                      index === 0
                        ? "h-4 w-4 shrink-0 text-ink/45"
                        : "h-4 w-4 shrink-0 opacity-0"
                    }
                  />
                  <span className="w-28 text-sm font-medium text-ink/60">
                    {row.label}
                  </span>
                  <span className="text-sm text-ink">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-6 bg-hairline" />

        <div className="space-y-3">
          <Eyebrow className="text-ink/50">Document preview</Eyebrow>

          {kycData.document_url ? (
            isPdf ? (
              <div className="flex items-center gap-4 rounded-xl border border-hairline bg-bone p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-hairline bg-surface">
                  <FileText className="h-5 w-5 text-blue-accent" />
                </div>
                <a
                  href={resolvedDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-accent underline-offset-4 hover:underline"
                >
                  View PDF document
                </a>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="flex w-full flex-col items-center rounded-xl border border-hairline bg-bone p-4 transition-colors hover:bg-warm-neutral/60"
              >
                <Image
                  src={resolvedDocUrl || "/icons/placeholder.svg"}
                  alt="KYC document"
                  width={400}
                  height={300}
                  className="max-h-64 rounded-lg object-contain"
                  unoptimized={isProxyMediaUrl(resolvedDocUrl)}
                />
                <Small className="mt-3 text-ink/60">
                  Click image to view full size
                </Small>
              </button>
            )
          ) : (
            <div className="rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-ink/55">
              No document uploaded
            </div>
          )}

          {kycData.document_url && !isPdf && (
            <KycDocumentPreviewDialog
              open={previewOpen}
              onOpenChange={setPreviewOpen}
              documentUrl={kycData.document_url}
            />
          )}

          {(kycData.status === "rejected" ||
            kycData.status === "resubmitted") &&
            kycData.verification_notes && (
              <CalloutBanner
                variant={kycData.status === "rejected" ? "rust" : "gold"}
                title={
                  kycData.status === "rejected"
                    ? "Rejection reason"
                    : "Reason for resubmission"
                }
                description={kycData.verification_notes}
                className="mt-4"
              />
            )}
        </div>
      </CardContent>
    </Card>
  );
}
