import type { ReactNode } from "react";

export type SupportErrorCtaProps = {
  title?: string;
  description?: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
};

export type ErrorPageLayoutProps = {
  children: ReactNode;
  /** Fill the whole screen, for the root error page that has no layout around it. */
  fullScreen?: boolean;
};

export type SupportBoundaryProps = {
  children: ReactNode;
};

export type SupportBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};
