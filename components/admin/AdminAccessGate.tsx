import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/actions/admin/role-actions";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Wraps admin analytics pages: signed-out users go to sign-in, other roles see Access Denied. */
export async function AdminAccessGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const role = await getUserRole(userId);
  const allowed = role === "admin" || role === "manager";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {allowed ? (
        children
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
