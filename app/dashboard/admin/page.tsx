import { notFound, redirect } from "next/navigation";
import { AdminOverview } from "@/components/admin/overview/admin-overview";
import { getUserRole } from "@/lib/auth/admin-auth";
import { auth } from "@/lib/auth/auth";

export const metadata = {
  title: "Overview | RefreeG Admin",
  robots: { index: false, follow: false },
};

const LAGOS = "Africa/Lagos";

function greetingFor(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: LAGOS,
    }).format(now),
  );
  return hour < 12
    ? "Good morning"
    : hour < 17
      ? "Good afternoon"
      : "Good evening";
}

export default async function AdminOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?redirect=${encodeURIComponent("/dashboard/admin")}`);
  }
  const role = await getUserRole(session.user.id);
  if (role !== "admin" && role !== "manager") notFound();

  const now = new Date();
  const firstName = session.user.name?.trim().split(/\s+/)[0];

  return (
    <AdminOverview
      greeting={`${greetingFor(now)}${firstName ? `, ${firstName}` : ""}`}
      dateLine={new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: LAGOS,
      }).format(now)}
    />
  );
}
