import { cn } from "@/lib/utils";
import type { ErrorPageLayoutProps } from "@/types/support-types";

/** Centres an error or not-found card on a cream page. */
export function ErrorPageLayout({
  children,
  fullScreen = false,
}: ErrorPageLayoutProps) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-3xl items-center px-4 py-12 sm:px-6",
        fullScreen ? "min-h-screen" : "min-h-[70vh]",
      )}
    >
      {children}
    </main>
  );
}
