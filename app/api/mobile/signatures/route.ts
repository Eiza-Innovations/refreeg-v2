import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { createSignature } from "@/actions/petitions/signature-actions";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/uuid";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, {
      namespace: "mobile_signatures_create",
      limit: 15,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    let authUserId: string | null = null;
    if (request.headers.get("authorization")) {
      const authResult = await authenticateMobileRequest(request);
      if (authResult.errorResponse) return authResult.errorResponse;
      authUserId = authResult.user!.id;
    }

    const body = await request.json();

    if (
      typeof body.petitionId !== "string" ||
      typeof body.firstName !== "string" ||
      typeof body.lastName !== "string" ||
      typeof body.email !== "string" ||
      typeof body.country !== "string" ||
      !body.petitionId.trim() ||
      !body.firstName.trim() ||
      !body.lastName.trim() ||
      !body.email.trim() ||
      !body.country.trim()
    ) {
      return apiError(
        "Missing required fields (petitionId, firstName, lastName, email, country)",
        400,
      );
    }

    if (!isUuid(body.petitionId)) {
      return apiError("Invalid petitionId format", 400);
    }

    const petition = await prisma.petitions.findUnique({
      where: { id: body.petitionId },
      select: { id: true, status: true },
    });

    if (!petition) {
      return apiError("Petition not found", 404);
    }

    if (petition.status !== "approved") {
      return apiError(
        "This petition is not accepting signatures currently",
        403,
      );
    }

    const normalizedEmail = body.email.trim().toLowerCase();
    const result = await createSignature(body.petitionId, authUserId, {
      amount: 1,
      name: `${body.firstName.trim()} ${body.lastName.trim()}`,
      email: normalizedEmail,
      message: typeof body.comment === "string" ? body.comment : "",
      isAnonymous: Boolean(body.isAnonymous),
    } as any);

    return apiSuccess(result, 201);
  } catch (error: any) {
    console.error("Mobile API Create Signature Error:", error);
    return apiError("Internal server error", 500);
  }
}
