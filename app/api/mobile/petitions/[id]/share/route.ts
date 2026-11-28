import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { savePetitionShare } from "@/actions/petitions/petition-actions";
import { isUuid } from "@/lib/uuid";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimited = enforceRateLimit(request, {
    namespace: "mobile_petition_share",
    limit: 20,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return apiError("Invalid petition id", 400);
    }

    await savePetitionShare(id);

    return apiSuccess({ message: "Share recorded successfully" });
  } catch (error: any) {
    console.error("Mobile API Share Petition Error:", error);
    return apiError("Internal server error", 500);
  }
}
