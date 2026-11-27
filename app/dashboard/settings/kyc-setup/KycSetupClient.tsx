"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import NavigationLoader from "@/components/layout/NavigationLoader";
import type { KycSetupClientProps } from "@/types/kyc-types";
import { KycStatusCard } from "../kyc/kyc-status-card";

const DiditKycForm = dynamic(() => import("./DiditKycForm"), {
  loading: () => <NavigationLoader />,
  ssr: false,
});

export default function KycSetupClient(props: KycSetupClientProps) {
  const router = useRouter();
  const status = props.currentKyc?.status;

  useEffect(() => {
    if (status !== "pending") return;
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [status, router]);

  if (props.currentKyc && (status === "pending" || status === "approved")) {
    return (
      <KycStatusCard
        kycData={props.currentKyc}
        context="setup"
        isPolling={status === "pending"}
      />
    );
  }

  const rejectedNote =
    props.rejectedKyc?.verification_notes ??
    (status === "resubmitted"
      ? props.currentKyc?.verification_notes
      : undefined);

  return (
    <div data-testid="kyc-setup-container" data-userid={props.userId}>
      <DiditKycForm
        userId={props.userId}
        rejectedNote={rejectedNote}
        kycFetchError={props.kycFetchError}
      />
    </div>
  );
}
