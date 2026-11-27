"use client";

import { useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import { ErrorPageLayout } from "@/components/engagement/ErrorPageLayout";
import { SupportErrorCta } from "@/components/engagement/SupportErrorCta";
import { reportClientError } from "@/lib/api/client-error-reporter";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    reportClientError(error, { type: "react" });
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-cream font-montserrat antialiased">
        <ErrorPageLayout fullScreen>
          <SupportErrorCta
            title="We hit an unrecoverable error"
            description="Please follow us on X and join our Telegram community for customer support while we sort this out."
            errorMessage={error.message}
            onRetry={() => router.push("/")}
            retryLabel="Go home"
          />
        </ErrorPageLayout>
      </body>
    </html>
  );
}
