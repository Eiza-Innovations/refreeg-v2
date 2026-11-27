import { permanentRedirect } from "next/navigation";

export default async function LegacyCauseDonateRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/campaigns/${id}/donate`);
}
