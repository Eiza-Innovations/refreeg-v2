import { NextRequest } from "next/server";
import {
  apiError,
  apiPaginated,
  handleCorsPreflight,
} from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/uuid";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return apiError("Invalid cause id", 400);
    }

    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get("limit") || "10", 10);
    const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 10 : rawLimit, 1), 50);
    const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0);

    const where = {
      causeId: id,
      status: "completed",
    };

    const [rows, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          causeId: true,
          amount: true,
          tip_amount: true,
          name: true,
          message: true,
          is_anonymous: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.donation.count({ where }),
    ]);

    const donations = rows.map((d) => ({
      id: d.id,
      cause_id: d.causeId,
      amount: Number(d.amount),
      tip_amount: Number(d.tip_amount ?? 0),
      name: d.is_anonymous ? "Anonymous" : d.name,
      message: d.message,
      is_anonymous: Boolean(d.is_anonymous),
      status: d.status,
      created_at: d.createdAt?.toISOString() ?? null,
    }));

    return apiPaginated(donations, total, limit, offset);
  } catch (error: any) {
    console.error("Mobile API Get Cause Donations Error:", error);
    return apiError("Internal server error", 500);
  }
}
