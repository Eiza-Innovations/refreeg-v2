"use client";

import { useRouter } from "nextjs-toploader/app";
import { ErrorPageLayout } from "@/components/engagement/ErrorPageLayout";
import { SupportErrorCta } from "@/components/engagement/SupportErrorCta";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <ErrorPageLayout>
      <SupportErrorCta
        title="Page not found"
        description="Looks like you took a wrong turn. Head back to the causes, or reach us on X or Telegram if you need a hand."
        onRetry={() => router.push("/causes")}
        retryLabel="Explore causes"
      />
    </ErrorPageLayout>
  );
}
