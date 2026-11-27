import type { Metadata } from "next";
import type { ReactNode } from "react";

// The pages are client components, so their title comes from this layout.
export const metadata: Metadata = { title: "Sign in" };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
