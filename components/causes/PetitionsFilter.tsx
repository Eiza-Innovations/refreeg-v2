"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface PetitionsFilterProps {
  categories: Category[];
  selectedCategory: string;
}

export function PetitionsFilter({
  categories,
  selectedCategory,
}: PetitionsFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleCategoryChange = (categoryId: string) => {
    const params = new URLSearchParams();
    if (categoryId !== "all") {
      params.set("category", categoryId);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div
      role="group"
      aria-label="Filter petitions by category"
      className="flex flex-wrap gap-2"
    >
      {[{ id: "all", name: "All" }, ...categories].map((category) => {
        const active = selectedCategory === category.id;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={active}
            onClick={() => handleCategoryChange(category.id)}
            className={cn(
              "h-9 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
              active
                ? "border-ink bg-ink text-ink-foreground"
                : "border-hairline bg-surface text-ink hover:border-ink/40 hover:bg-bone",
            )}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
