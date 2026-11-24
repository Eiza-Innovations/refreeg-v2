import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/actions/admin/role-actions";
import { getOrganizationVerificationQueue } from "@/actions/admin/admin-organization-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { VerificationReviewClient } from "./verification-review-client";

export default async function OrganizationVerificationsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/auth/signin");
  }

  const userRole = await getUserRole(userId);
  if (!userRole || (userRole !== "admin" && userRole !== "manager")) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const result = await getOrganizationVerificationQueue();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <Eyebrow>Organisations</Eyebrow>
        <h1 className="mt-1 font-fraunces text-2xl font-medium text-ink">
          Verification review
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Registration documents and director IDs from organisations. Reviews
          take about 2 working days.
        </p>
      </div>

      {result.success ? (
        <VerificationReviewClient initialSubmissions={result.submissions} />
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-rust">
            {result.error}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
