import { notFound, redirect } from "next/navigation";
import { getCause } from "@/actions/causes/cause-actions";
import { getSessionUser } from "@/lib/auth/session-user";
import { getProfile } from "@/actions/users/profile-actions";
import PledgeScreen from "@/app/campaign/_components/pledge-screen";
import { causePublicPath } from "@/lib/causes/slug";
import { isUuid } from "@/lib/uuid";

export default async function CausePledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cause = await getCause(id);
  if (!cause) {
    notFound();
  }

  if (isUuid(id) && cause.slug) {
    redirect(`${causePublicPath(cause)}/pledge`);
  }

  const user = await getSessionUser();
  const myprofile = user ? await getProfile(user.id) : undefined;

  const profile = {
    email: myprofile?.email || "",
    name: myprofile?.full_name || "",
    id: myprofile?.id || "",
    subaccount: myprofile?.sub_account_code || "",
  };

  return <PledgeScreen cause={cause} profile={profile} />;
}
