export const GIVING_SEARCH_EVENT = "giving:search";

export type GivingSearchDetail = {
  /** The trimmed query the header search committed. Empty string = cleared. */
  q: string;
};
