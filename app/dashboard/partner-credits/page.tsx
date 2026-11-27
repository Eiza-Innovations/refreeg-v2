import { redirect } from "next/navigation";
import { getPartnerCreditsDashboard } from "@/actions/partners/partner-credit-actions";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { PartnerCreditsClient } from "./partner-credits-client";

export default async function PartnerCreditsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const res = await getPartnerCreditsDashboard();
  if (!res.success || !res.data) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Unable to load partner credits</CardTitle>
            <CardDescription>
              {res.success ? "Could not load partner credits." : res.error}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <PartnerCreditsClient initialData={res.data} />;
}
