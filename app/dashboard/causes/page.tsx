import { redirect } from "next/navigation";
import { MyItemsPage } from "@/components/dashboard/MyItemsPage";
import { MyCausesList } from "@/components/causes/MyCausesList";
import { ProofComplianceBanner } from "@/components/proof/proof-compliance-banner";
import { myCauseStatusOptions } from "@/lib/options/cause.options";
import { optionValue } from "@/lib/options/option-label";
import { getSessionUser } from "@/lib/auth/session-user";

export default async function MyCausesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/signin");

  const param = await searchParams;
  const status = optionValue(myCauseStatusOptions, param.status, "all");

  return (
    <MyItemsPage
      eyebrow="Fundraising"
      title="My campaigns"
      description="Track funding, manage approvals, and keep every campaign moving forward from one place."
      basePath="/dashboard/causes"
      createLabel="Start a campaign"
      statusOptions={myCauseStatusOptions}
      status={status}
      banner={<ProofComplianceBanner userId={user.id} />}
    >
      <MyCausesList status={status} userId={user.id} />
    </MyItemsPage>
  );
}
