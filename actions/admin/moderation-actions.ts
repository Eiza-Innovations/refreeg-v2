"use server";

import { revalidatePath } from "next/cache";
import { getUserRole } from "@/actions/admin/role-actions";
import { auth } from "@/lib/auth/auth";
import {
  resolveModerationReport,
  VALID_MODERATION_ACTIONS,
  type ModerationAction,
} from "@/lib/moderation/moderation-service";
import { isUuid } from "@/lib/uuid";

export async function resolveModerationReportAction(
  reportId: string,
  action: ModerationAction,
): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await auth();
  const adminId = session?.user?.id;
  if (!adminId) {
    return { success: false, error: "Not authenticated" };
  }

  const role = await getUserRole(adminId);
  if (role !== "admin" && role !== "manager") {
    return { success: false, error: "Unauthorized" };
  }

  if (
    !isUuid(reportId) ||
    !(VALID_MODERATION_ACTIONS as readonly string[]).includes(action)
  ) {
    return { success: false, error: "Invalid moderation request" };
  }

  const result = await resolveModerationReport({
    reportId,
    adminId,
    action,
  });

  if (!result.success) {
    return { success: false, error: result.message };
  }

  revalidatePath("/dashboard/admin/reports");
  return { success: true, message: result.message };
}
