import { redirect } from "next/navigation";

function toQueryString(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (Array.isArray(v)) v.forEach((item) => qs.append(k, item));
    else if (v !== undefined) qs.set(k, v);
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export default async function LegacyPaymentVerifyRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  redirect(`/campaigns/${id}/payment/verify${toQueryString(query)}`);
}
