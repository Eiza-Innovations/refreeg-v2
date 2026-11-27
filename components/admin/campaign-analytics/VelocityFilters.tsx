import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  velocityCategoryOptions,
  velocityForecastOptions,
  velocityStateOptions,
} from "@/lib/options/campaign-analytics.options";
import type { Option } from "@/types/options";

export type VelocityFilterState = {
  search: string;
  category: string;
  forecast: string;
  state: string;
};

export function VelocityFilters({
  filters,
  categories,
  onChange,
}: {
  filters: VelocityFilterState;
  categories: string[];
  onChange: (key: keyof VelocityFilterState, value: string) => void;
}) {
  const selects: {
    key: Exclude<keyof VelocityFilterState, "search">;
    label: string;
    className: string;
    options: readonly Option[];
  }[] = [
    {
      key: "category",
      label: "Filter by category",
      className: "w-44 bg-surface",
      options: [
        ...velocityCategoryOptions,
        ...categories.map((category) => ({ label: category, value: category })),
      ],
    },
    {
      key: "forecast",
      label: "Filter by forecast",
      className: "w-44 bg-surface",
      options: velocityForecastOptions,
    },
    {
      key: "state",
      label: "Campaign state",
      className: "w-28 border-ink bg-ink text-ink-foreground",
      options: velocityStateOptions,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <Input
          value={filters.search}
          onChange={(event) => onChange("search", event.target.value)}
          placeholder="Search campaigns"
          className="w-60 bg-surface pl-9"
          aria-label="Search campaigns"
        />
      </div>
      {selects.map((select) => (
        <Select
          key={select.key}
          value={filters[select.key]}
          onValueChange={(value) => onChange(select.key, value)}
        >
          <SelectTrigger className={select.className} aria-label={select.label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {select.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
