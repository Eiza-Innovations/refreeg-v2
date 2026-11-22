import { NextRequest } from "next/server";
import { apiError, handleCorsPreflight } from "@/lib/api/response";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(_request: NextRequest) {
  return apiError(
    "Direct donation creation is disabled. Complete payment via /api/mobile/payments/initialize and verify via /api/mobile/payments/verify.",
    405,
  );
}
