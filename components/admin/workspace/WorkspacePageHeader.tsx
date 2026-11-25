import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

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
            <span>{title}</span>
          </nav>
        )}
        <h1 className="font-fraunces text-[32px] font-normal leading-tight tracking-tight text-ink">
          {title}
        </h1>
        <p className="text-sm text-ink/60">{subtitle}</p>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
