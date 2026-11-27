import dynamic from "next/dynamic";
import {
  addDays,
  differenceInDays,
  format,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { calendarClassNames } from "@/components/ui/field-styles";
import { MAX_PETITION_DURATION_DAYS } from "@/lib/schemas/petition.schema";
import { FieldError } from "@/components/ui/field-error";
import { StepHeading } from "./StepHeading";
import type { PetitionFieldsStepProps } from "@/types/petition-types";

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => mod.Calendar),
  { loading: () => <Skeleton className="h-[300px] w-full" />, ssr: false },
);

export function PetitionTimelineStep({
  form,
  errors,
  setFormFields,
  copy,
}: PetitionFieldsStepProps) {
  const { startDate, endDate } = form;
  const today = startOfDay(new Date());

  const isEndDateDisabled = (date: Date) => {
    const start = startDate || today;
    return (
      isBefore(date, start) ||
      isAfter(date, addDays(start, MAX_PETITION_DURATION_DAYS))
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StepHeading title={copy.timelineTitle} text={copy.timelineText} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Label className="mb-2 block">{copy.startLabel}</Label>
          <Card variant="surface" className="p-4">
            <Calendar
              mode="single"
              classNames={calendarClassNames}
              selected={startDate}
              onSelect={(date) => setFormFields("startDate", date)}
              disabled={(date) => isBefore(date, today)}
              initialFocus
            />
          </Card>
          <FieldError message={errors.startDate} />
        </div>

        <div className="space-y-4">
          <Label className="mb-2 block">End date</Label>
          <Card variant="surface" className="p-4">
            <Calendar
              mode="single"
              classNames={calendarClassNames}
              selected={endDate}
              onSelect={(date) => setFormFields("endDate", date)}
              disabled={isEndDateDisabled}
              initialFocus
            />
          </Card>
          <FieldError message={errors.endDate} />
        </div>
      </div>

      {startDate && endDate && (
        <div className="flex items-center gap-3 rounded-xl border border-sand bg-sand/30 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">
              Open for {differenceInDays(endDate, startDate)} days
            </p>
            <p className="text-xs text-ink/60">
              Running from {format(startDate, "PPP")} to{" "}
              {format(endDate, "PPP")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
