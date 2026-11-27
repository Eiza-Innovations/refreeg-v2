/**
 * Heading and actions on the left, form or checklist on the right from the
 * `lg` breakpoint. The explicit single column below it matters: without it the
 * implicit track grows to its widest unbreakable text and pushes the content
 * past the edge of a phone screen.
 *
 * Lives under components/ because Tailwind only scans app/ and components/;
 * a class string in lib/ would never get its CSS generated.
 */
export const onboardingSplitClass =
  "grid w-full grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16";
