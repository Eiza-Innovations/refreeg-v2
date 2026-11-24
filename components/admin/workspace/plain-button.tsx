"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Text-style button: a ghost Button with no padding or hover fill. */
export function PlainButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      className={cn("h-auto p-0 font-normal hover:bg-transparent", className)}
      {...props}
    />
  );
}
