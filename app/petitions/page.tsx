import { Suspense } from "react";
import { PetitionsList } from "@/components/causes/PetitionsList";
import { PetitionsFilter } from "@/components/causes/PetitionsFilter";
import { Skeleton } from "@/components/ui/skeleton";
import { categories } from "@/lib/causes/categories";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading, Lead } from "@/components/marketing/Typography";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Petitions",
  description:
    "Discover and sign petitions that are driving global change and social impact.",
};

export default async function PetitionsPage({
  searchParams,
}: {
  searchParams: { category?: string; page?: string };
}) {
  const params = await searchParams;
  const category = params.category || "all";
  const page = Number.parseInt(params.page || "1");
  const pageSize = 9;

  return (
    <div className="w-full bg-cream">
      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-2 pt-2">
          <Eyebrow>Petitions</Eyebrow>
          <Heading as="h1" size="subsection">
            Explore petitions
          </Heading>
          <Lead className="max-w-xl text-sm text-ink/60">
            Discover and support petitions that are making a difference.
          </Lead>
        </div>

        <PetitionsFilter categories={categories} selectedCategory={category} />

        <Suspense
          fallback={
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array(pageSize)
                .fill(null)
                .map((_, i) => (
                  <Skeleton key={i} className="h-[280px] w-full rounded-2xl" />
                ))}
            </div>
          }
        >
          <PetitionsList category={category} page={page} pageSize={pageSize} />
        </Suspense>
      </div>
    </div>
  );
}
