import type { Metadata } from "next";
import type { ReactNode } from "react";

// The pages are client components, so their title comes from this layout.
export const metadata: Metadata = { title: "Set up your account" };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
