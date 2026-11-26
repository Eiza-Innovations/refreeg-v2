/** Token-based form control styles for the petition forms. */
export const fieldClass =
  "rounded-xl border-hairline bg-surface text-ink shadow-none placeholder:text-ink/40 focus-visible:border-forest focus-visible:ring-forest/15 focus-visible:ring-offset-0";

export const selectTriggerClass =
  "rounded-xl border-hairline bg-surface text-ink shadow-none focus:border-forest focus:ring-forest/15 focus:ring-offset-0 data-[placeholder]:text-ink/40";

export const selectContentClass =
  "rounded-xl border-hairline bg-surface text-ink shadow-card";

export const selectItemClass =
  "rounded-lg focus:bg-bone focus:text-ink data-[state=checked]:font-semibold";

/** react-day-picker class overrides in the new design (forest selection, hairline nav). */
export const calendarClassNames = {
  nav_button:
    "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-surface p-0 text-ink opacity-70 hover:bg-bone hover:opacity-100",
  day: "h-9 w-9 rounded-lg p-0 font-normal text-ink hover:bg-bone aria-selected:opacity-100",
  day_selected:
    "!bg-ink !text-ink-foreground hover:!bg-ink hover:!text-ink-foreground focus:!bg-ink focus:!text-ink-foreground",
  day_today:
    "border border-forest/40 bg-bone text-ink aria-selected:border-ink aria-selected:bg-ink aria-selected:text-ink-foreground",
  day_disabled: "text-ink/30",
  head_cell: "w-9 rounded-md text-[0.8rem] font-normal text-ink/50",
  day_range_middle: "aria-selected:bg-bone aria-selected:text-ink",
};
