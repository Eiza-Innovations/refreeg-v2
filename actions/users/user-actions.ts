"use server";

import { revalidatePath } from "next/cache";
import { logAdminActivity } from "@/actions/admin/database-actions";
import { getUserRole } from "@/actions/admin/role-actions";
import { executeUserAccountDeletion } from "@/lib/auth/account-deletion";
import { auth } from "@/lib/auth/auth";
import { isStoreReviewDemoAccount } from "@/lib/auth/store-review-demo";
import { prisma } from "@/lib/prisma";

export async function blockUser(userId: string): Promise<boolean> {
  const session = await auth();

  if (!session?.user?.id) {
    console.error("Unauthorized: No user found");
    return false;
  }

  if (session.user.id === userId) {
    console.error("Unauthorized: Cannot block yourself");
    return false;
  }

  const currentUserRole = await getUserRole(session.user.id);
  if (currentUserRole !== "admin" && currentUserRole !== "manager") {
    console.error("Unauthorized: Insufficient permissions to block user");
    return false;
  }

  const targetUserRole = await getUserRole(userId);
  if (currentUserRole === "manager" && targetUserRole === "admin") {
    console.error("Unauthorized: Managers cannot block admin accounts");
    return false;
  }

  try {
    const now = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBlocked: true,
        sessions_invalidated_after: now,
        updatedAt: now,
      },
    });

    await logAdminActivity("block-user", session.user.id);
    revalidatePath("/dashboard/admin/users");
    return true;
  } catch (error) {
    console.error("Error blocking user:", error);
    return false;
  }
}

export async function unblockUser(userId: string): Promise<boolean> {
  const session = await auth();

  if (!session?.user?.id) {
    console.error("Unauthorized: No user found");
    return false;
  }

  const currentUserRole = await getUserRole(session.user.id);
  if (currentUserRole !== "admin" && currentUserRole !== "manager") {
    console.error("Unauthorized: Insufficient permissions to unblock user");
    return false;
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBlocked: false,
        updatedAt: new Date(),
      },
    });

    await logAdminActivity("unblock-user", session.user.id);
    revalidatePath("/dashboard/admin/users");
    return true;
  } catch (error) {
    console.error("Error unblocking user:", error);
    return false;
  }
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBlocked: true },
    });
    return user?.isBlocked || false;
  } catch (error) {
    console.error("Error checking if user is blocked:", error);
    return false;
  }
}

export async function deleteUserAccount(
  userId: string,
): Promise<{ error: string | null }> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { error: "Not authenticated" };
    }

    if (session.user.id !== userId) {
      return { error: "You can only delete your own account" };
    }

    if (isStoreReviewDemoAccount(session.user.email)) {
      revalidatePath("/dashboard/settings");
      return { error: null };
    }

    const result = await executeUserAccountDeletion(userId);
    if (!result.success) {
      return { error: result.error ?? "Failed to delete account" };
    }

    revalidatePath("/dashboard/settings");
    return { error: null };
  } catch (error) {
    console.error("Error in deleteUserAccount:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete account",
    };
  }
}

export async function deleteUserAsAdmin(
  userId: string,
): Promise<{ error: string | null }> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { error: "Not authenticated" };
    }

    if (session.user.id === userId) {
      return {
        error: "You cannot delete your own account from admin user management",
      };
    }

    const currentUserRole = await getUserRole(session.user.id);
    if (currentUserRole !== "admin" && currentUserRole !== "manager") {
      return {
        error: "Unauthorized: Only admins and managers can delete users",
      };
    }

    const targetUserRole = await getUserRole(userId);
    if (currentUserRole === "manager" && targetUserRole === "admin") {
      return {
        error: "Unauthorized: Managers cannot delete admin accounts",
      };
    }

    const result = await executeUserAccountDeletion(userId);
    if (!result.success) {
      return { error: result.error ?? "Failed to delete user" };
    }

    await logAdminActivity("delete-user", session.user.id);

    revalidatePath("/dashboard/admin/users");
    return { error: null };
  } catch (error) {
    console.error("Error in deleteUserAsAdmin:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete user",
    };
  }
}
