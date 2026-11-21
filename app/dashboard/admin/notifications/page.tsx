import { redirect } from "next/navigation";
import { isAdminOrManager } from "@/actions/admin/role-actions";
import {
  AdminNotificationsTabs,
  type NotificationChannel,
} from "@/components/admin/notifications/AdminNotificationsTabs";
import { Heading, P } from "@/components/marketing/Typography";
import { Eyebrow } from "@/components/ui/eyebrow";
import { auth } from "@/lib/auth/auth";

export const metadata = {
  title: "Notifications | RefreeG Admin",
  description:
    "Send email announcements, manage event triggers, and broadcast mobile push notifications.",
};

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const isAuthorized = await isAdminOrManager(session.user.id);
  if (!isAuthorized) {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const defaultChannel: NotificationChannel =
    tabParam === "push" ? "push" : "email";

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-1">
        <Eyebrow>Notifications</Eyebrow>
        <Heading as="h1" size="subsection">
          Notifications
        </Heading>
        <P className="text-ink/60">
          Send email announcements, manage event triggers, and broadcast mobile
          push notifications.
        </P>
      </div>
      <AdminNotificationsTabs defaultChannel={defaultChannel} />
    </div>
  );
}
