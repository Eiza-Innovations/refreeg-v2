import { redirect } from "next/navigation";
import { MyItemsPage } from "@/components/dashboard/MyItemsPage";
import { MyPetitionsList } from "@/components/causes/MyPetitionsList";
import { optionValue } from "@/lib/options/option-label";
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
  const status = optionValue(myPetitionStatusOptions, param.status, "all");

  return (
    <MyItemsPage
      eyebrow="Petitions"
      title="My petitions"
      description="Track signatures, see where each petition is in review, and keep support growing."
      basePath="/dashboard/petitions"
      createLabel="Start a petition"
      statusOptions={myPetitionStatusOptions}
      status={status}
    >
      <MyPetitionsList status={status} userId={user.id} />
    </MyItemsPage>
  );
}
