import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Heading, P, Span } from "@/components/marketing/Typography";

export function WorkspacePageHeader({
  title,
  subtitle,
  crumb,
  onCrumb,
  actions,
}: {
  title: string;
  subtitle: string;
  crumb?: string;
  onCrumb?: () => void;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        {crumb && (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-ink/50"
          >
            <button type="button" onClick={onCrumb} className="hover:text-ink">
              {crumb}
            </button>
            <ArrowRight className="h-3 w-3" />
            <Span>{title}</Span>
          </nav>
        )}
        <Heading
          as="h1"
          size="subsection"
          className="leading-tight tracking-tight md:text-[32px]"
        >
          {title}
        </Heading>
        <P className="text-ink/60 md:text-sm">{subtitle}</P>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
