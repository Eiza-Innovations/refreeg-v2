import { redirect } from "next/navigation";
import { getAdminPartnerCreditsDashboard } from "@/actions/partners/partner-credit-actions";
import { getUserRole } from "@/actions/admin/role-actions";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { AdminPartnersClient } from "./partners-client";

export default async function AdminPartnersPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/auth/signin");
  }

  const role = await getUserRole(userId);
  if (!role || (role !== "admin" && role !== "manager")) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view partner credits.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const res = await getAdminPartnerCreditsDashboard();
  if (!res.success || !res.data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Unable to load partners</CardTitle>
            <CardDescription>
              {res.success ? "Could not load partner credits." : res.error}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <AdminPartnersClient initialData={res.data} />;
}
