import dynamic from "next/dynamic";
import {
  addDays,
  differenceInDays,
  format,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_DURATION_DAYS } from "@/lib/schemas/cause.schema";
import {
  formatFundingGoalInput,
  normalizeFundingGoalInput,
} from "@/lib/causes/funding-goal";
import { causeCurrencyOptions } from "@/lib/options/cause.options";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { useCauseForm } from "@/hooks/use-cause-form";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/ui/field-error";

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => mod.Calendar),
  { loading: () => <Skeleton className="h-[300px] w-full" />, ssr: false },
);

type DateField = "startDate" | "endDate";

type Props = Pick<
  ReturnType<typeof useCauseForm>,
  "form" | "errors" | "setFormFields"
>;

export function CauseTimelineStep({
  form: { startDate, endDate, goal, currency },
  errors,
  setFormFields,
}: Props) {
  const today = startOfDay(new Date());
  const duration =
    startDate && endDate ? differenceInDays(endDate, startDate) : null;

  const datePicker = (field: DateField, label: string, id: string) => {
    const value = field === "startDate" ? startDate : endDate;
    const isDisabled = (date: Date) => {
      if (field === "startDate") return isBefore(date, today);
      const start = startDate || today;
      return (
        isBefore(date, start) ||
        isAfter(date, addDays(start, MAX_DURATION_DAYS))
      );
    };

    return (
      <div className="space-y-2">
        <Label htmlFor={id} className="label-eyebrow">
          {label}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="surface"
              aria-invalid={Boolean(errors[field])}
              className={cn(
                "h-12 w-full justify-between rounded-xl text-left font-medium premium-input",
                !value && "text-muted-foreground",
              )}
            >
              {value ? format(value, "PPP") : <Span>Pick a date</Span>}
              <ChevronDown aria-hidden="true" className="h-4 w-4 text-ink/60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={(date) => setFormFields(field, date)}
              disabled={isDisabled}
              defaultMonth={
                value ||
                (field === "endDate" ? startDate : undefined) ||
                new Date()
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <FieldError message={errors[field]} />
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-start">
        <div className="space-y-2">
          <Label htmlFor="goal" className="label-eyebrow">
            Funding goal
          </Label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-fraunces text-xl text-ink/60"
            >
              ₦
            </span>
            <Input
              id="goal"
              name="goal"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatFundingGoalInput(goal)}
              onChange={(event) => {
                const value = normalizeFundingGoalInput(event.target.value);
                if (value !== null) setFormFields("goal", value);
              }}
              aria-invalid={Boolean(errors.goal)}
              className="premium-input h-14 pl-10 font-fraunces text-2xl md:text-2xl"
            />
          </div>
          <FieldError message={errors.goal} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency" className="label-eyebrow">
            Currency
          </Label>
          <Select
            value={currency}
            onValueChange={(value) => setFormFields("currency", value)}
          >
            <SelectTrigger id="currency" className="h-14 premium-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {causeCurrencyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Separator className="bg-hairline" />
      <div className="grid gap-4 sm:grid-cols-2">
        {datePicker("startDate", "Start Date", "start-date")}
        {datePicker("endDate", "Runs Until", "end-date")}
      </div>
      {duration !== null && duration > 0 && (
        <P className="w-fit rounded-xl bg-blue-accent/5 px-4 py-2 text-sm font-medium">
          {duration} {duration === 1 ? "day" : "days"}
        </P>
      )}
    </div>
  );
}
import { P, Span } from "@/components/marketing/Typography";
