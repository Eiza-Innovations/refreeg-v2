"use client";

import dynamic from "next/dynamic";
import { EmailAdminTabs } from "@/components/admin/email/EmailAdminTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BroadcastPushForm = dynamic(
  () => import("@/components/admin/BroadcastPushForm"),
  {
    loading: () => <Skeleton className="h-[600px] w-full rounded-2xl" />,
  },
);

export type NotificationChannel = "email" | "push";

interface AdminNotificationsTabsProps {
  defaultChannel?: NotificationChannel;
}

export function AdminNotificationsTabs({
  defaultChannel = "email",
}: AdminNotificationsTabsProps) {
  return (
    <Tabs
      key={defaultChannel}
      defaultValue={defaultChannel}
      className="space-y-6"
    >
      <TabsList variant="underline">
        <TabsTrigger variant="underline" value="email">
          Email
        </TabsTrigger>
        <TabsTrigger variant="underline" value="push">
          Mobile Push
        </TabsTrigger>
      </TabsList>

      <TabsContent value="email" className="mt-0">
        <EmailAdminTabs />
      </TabsContent>

      <TabsContent value="push" className="mt-0">
        <BroadcastPushForm />
      </TabsContent>
    </Tabs>
  );
}
