"use client";

import { useEffect } from "react";
import { trackFunnelStep } from "@/lib/campaign-analytics/track-funnel";

export function FunnelStepBeacon({
  causeId,
  step,
}: {
  causeId: string;
  step: "view" | "give";
}) {
  useEffect(() => {
    trackFunnelStep(causeId, step);
  }, [causeId, step]);

  return null;
}
