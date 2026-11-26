import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heading, Lead } from "@/components/marketing/Typography";
import { MyPetitionsList } from "@/components/causes/MyPetitionsList";
import { myPetitionStatusOptions } from "@/lib/options/petition.options";
import { getSessionUser } from "@/lib/auth/session-user";

export default async function MyPetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/signin");

  const param = await searchParams;
  const status =
    myPetitionStatusOptions.find((option) => option.value === param.status)
      ?.value ?? "all";

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Petitions</Eyebrow>
          <Heading as="h1" size="subsection" className="mt-2">
            My petitions
          </Heading>
          <Lead className="mt-2 max-w-xl text-sm text-ink/60">
            Track signatures, see where each petition is in review, and keep
            support growing.
          </Lead>
        </div>
        <Button asChild variant="ink" className="h-11 rounded-xl px-5">
          <Link href="/dashboard/petitions/create">
            <Plus className="mr-2 h-4 w-4" />
            Start a petition
          </Link>
        </Button>
      </div>

      <Tabs defaultValue={status} className="mt-6 space-y-6">
        <TabsList variant="pill" className="h-auto max-w-full overflow-x-auto">
          {myPetitionStatusOptions.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              variant="pill"
              asChild
            >
              <Link
                href={
                  option.value === "all"
                    ? "/dashboard/petitions"
                    : `/dashboard/petitions?status=${option.value}`
                }
              >
                {option.label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={status} className="mt-0">
          <MyPetitionsList status={status} userId={user.id} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
