import { permanentRedirect } from "next/navigation";

export default async function LegacyCausePledgeRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/campaigns/${id}/pledge`);
}
