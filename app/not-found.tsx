"use client";

import { useRouter } from "nextjs-toploader/app";
import { ErrorPageLayout } from "@/components/engagement/ErrorPageLayout";
import { SupportErrorCta } from "@/components/engagement/SupportErrorCta";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <ErrorPageLayout>
      <SupportErrorCta
        title="This page could not be found"
        description="Please follow us on X and join our Telegram community for customer support if you need help finding the right page."
        onRetry={() => router.push("/")}
        retryLabel="Go home"
      />
    </ErrorPageLayout>
  );
}
