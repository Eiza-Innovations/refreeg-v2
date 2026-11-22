import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/uuid";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petitionId = searchParams.get("petitionId");
    const email = searchParams.get("email");

    if (!petitionId || !email) {
      return apiError("Missing required parameters (petitionId, email)", 400);
    }

    if (!isUuid(petitionId)) {
      return apiError("Invalid petitionId format", 400);
    }

    const existing = await prisma.signatures.findFirst({
      where: {
        petition_id: petitionId,
        email: email.trim().toLowerCase(),
      },
      select: { id: true },
    });

    return apiSuccess({ hasSigned: Boolean(existing) });
  } catch (error: any) {
    console.error("Mobile API Check Signature Error:", error);
    return apiError("Internal server error", 500);
  }
}
