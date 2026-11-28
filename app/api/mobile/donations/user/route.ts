import { NextRequest } from "next/server";
import {
  apiError,
  apiPaginated,
  handleCorsPreflight,
} from "@/lib/api/response";
import { parsePagination } from "@/lib/api/pagination";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams);

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where: { email: user!.email },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          cause: {
            select: {
              title: true,
              image: true,
            },
          },
        },
      }),
      prisma.donation.count({
        where: { email: user!.email },
      }),
    ]);

    return apiPaginated(donations, total, limit, offset);
  } catch (error: any) {
    console.error("Mobile API Get User Donations Error:", error);
    return apiError("Internal server error", 500);
  }
}
