import type { Metadata } from "next";
import type { ReactNode } from "react";

// Absolute titles: this segment has a child page (organization), and nested
// layouts do not reliably inherit the root "%s - Refreeg" template.
export const metadata: Metadata = {
  title: { absolute: "Create your account - Refreeg" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
