import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  createHref: string;
  createLabel: string;
};

/** Empty list in My campaigns and My petitions, with a way to start one. */
export function MyItemsEmptyState({
  icon,
  title,
  description,
  createHref,
  createLabel,
}: Props) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={
        <Button asChild variant="ink" className="rounded-xl">
          <Link href={createHref}>
            <Plus className="mr-2 h-4 w-4" />
            {createLabel}
          </Link>
        </Button>
      }
    />
  );
}
