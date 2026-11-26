import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { StatusTabs } from "@/components/dashboard/StatusTabs";
import { Heading, Lead } from "@/components/marketing/Typography";
import type { Option } from "@/types/options";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  /** The section path, such as /dashboard/causes. Create lives at `${basePath}/create`. */
  basePath: string;
  createLabel: string;
  statusOptions: readonly Option[];
  status: string;
  /** Shown between the header and the tabs, such as a compliance banner. */
  banner?: ReactNode;
  children: ReactNode;
};

/** Header, status tabs and body shared by My campaigns and My petitions. */
export function MyItemsPage({
  eyebrow,
  title,
  description,
  basePath,
  createLabel,
  statusOptions,
  status,
  banner,
  children,
}: Props) {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading as="h1" size="subsection" className="mt-2">
            {title}
          </Heading>
          <Lead className="mt-2 max-w-xl text-sm text-ink/60">
            {description}
          </Lead>
        </div>
        <Button asChild variant="ink" className="h-11 rounded-xl px-5">
          <Link href={`${basePath}/create`}>
            <Plus className="mr-2 h-4 w-4" />
            {createLabel}
          </Link>
        </Button>
      </div>

      {banner && <div className="mt-6">{banner}</div>}

      <div className="mt-6">
        <StatusTabs
          options={statusOptions}
          status={status}
          basePath={basePath}
        />
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}
