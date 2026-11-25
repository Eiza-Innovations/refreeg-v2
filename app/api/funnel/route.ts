import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { recordFunnelEvent } from "@/actions/causes/funnel-actions";
import { funnelEventSchema } from "@/lib/schemas/campaign-analytics.schema";

export async function POST(request: NextRequest) {
  const { limited } = checkRateLimit(request, {
    namespace: "funnel_events",
    limit: 120,
    windowMs: 60_000,
  });
  if (limited) return new NextResponse(null, { status: 429 });

  const parsed = funnelEventSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const session = await auth();
  try {
    await recordFunnelEvent({
      ...parsed.data,
      userId: session?.user?.id ?? null,
      userAgent: request.headers.get("user-agent"),
    });
  } catch (error) {
    // A missing cause or a DB hiccup must never break giving.
    console.error("Funnel event not recorded:", error);
  }
  return new NextResponse(null, { status: 204 });
}
