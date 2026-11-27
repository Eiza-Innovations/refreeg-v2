"use client";

import { getCampaignCategoryStyle } from "@/lib/causes/campaign-categories";
import { categories } from "@/lib/causes/categories";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Span } from "@/components/marketing/Typography";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CampaignCategorySelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  invalid?: boolean;
  className?: string;
  variant?: "select" | "tiles";
};

export function CampaignCategorySelect({
  value,
  onValueChange,
  invalid = false,
  className,
  variant = "select",
}: CampaignCategorySelectProps) {
  const selectedCategory = value ? getCampaignCategoryStyle(value) : null;
  const SelectedIcon = selectedCategory?.icon;

  if (variant === "tiles") {
    return (
      <div className={cn("space-y-3", className)}>
        <Label id="category-label" className="label-eyebrow">
          Category
        </Label>
        <RadioGroup
          aria-labelledby="category-label"
          aria-invalid={invalid}
          className="grid-cols-2 gap-2 xl:grid-cols-3"
          value={value}
          onValueChange={onValueChange}
        >
          {categories.map((category) => (
            <Label
              key={category.id}
              className="flex min-h-14 cursor-pointer items-center gap-2 rounded-xl bg-bone px-3 py-2 leading-snug hover:bg-warm-neutral has-[[data-state=checked]]:bg-blue-accent/5 has-[[data-state=checked]]:font-semibold sm:gap-3 sm:px-4"
            >
              <RadioGroupItem
                value={category.id}
                className="shrink-0 border-transparent bg-warm-neutral data-[state=checked]:bg-blue-accent data-[state=checked]:text-white"
              />
              {category.name}
            </Label>
          ))}
        </RadioGroup>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        id="category"
        aria-invalid={invalid}
        className={cn(
          "premium-input h-11 sm:h-12",
          invalid && "border-rust",
          className,
        )}
      >
        <SelectValue placeholder="What's this about?">
          {selectedCategory && SelectedIcon ? (
            <Span className="flex items-center gap-2.5">
              <Span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  selectedCategory.iconBackgroundClassName,
                )}
              >
                <SelectedIcon
                  className={cn("h-4 w-4", selectedCategory.iconClassName)}
                />
              </Span>
              <Span className="font-medium text-ink">
                {selectedCategory.name}
              </Span>
            </Span>
          ) : undefined}
        </SelectValue>
      </SelectTrigger>

      <SelectContent className="rounded-xl border-hairline p-1 shadow-xl">
        {categories.map((category) => {
          const categoryStyle = getCampaignCategoryStyle(category.id);
          const CategoryIcon = categoryStyle.icon;

          return (
            <SelectItem
              key={category.id}
              value={category.id}
              className="rounded-lg py-2.5 pl-9 pr-3 focus:bg-bone data-[state=checked]:bg-blue-accent/5"
            >
              <Span className="flex items-center gap-3">
                <Span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    categoryStyle.iconBackgroundClassName,
                  )}
                >
                  <CategoryIcon
                    className={cn("h-4 w-4", categoryStyle.iconClassName)}
                  />
                </Span>
                <Span className="font-medium text-ink">
                  {categoryStyle.name}
                </Span>
              </Span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
