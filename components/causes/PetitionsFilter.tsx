"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Button } from "@/components/ui/button";

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
          <Button
            key={category.id}
            type="button"
            variant={active ? "ink" : "surface"}
            aria-pressed={active}
            onClick={() => handleCategoryChange(category.id)}
            className="h-9 rounded-full px-4"
          >
            {category.name}
          </Button>
        );
      })}
    </div>
  );
}
