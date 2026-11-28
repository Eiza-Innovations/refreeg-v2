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

    const [signatures, total] = await Promise.all([
      prisma.signatures.findMany({
        where: { email: user!.email },
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
        include: {
          petition: {
            select: {
              title: true,
              image: true,
            },
          },
        },
      }),
      prisma.signatures.count({
        where: { email: user!.email },
      }),
    ]);

    return apiPaginated(signatures, total, limit, offset);
  } catch (error: any) {
    console.error("Mobile API Get User Signatures Error:", error);
    return apiError("Internal server error", 500);
  }
}
