import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/api/client-ip";
import { apiError } from "@/lib/api/response";

// Small fixed-window in-memory limiter with a bounded key set per namespace.
// Per process: pair with edge limits (CloudFront/WAF) for distributed enforcement.
type Bucket = { count: number; resetAt: number };

export interface RateLimitOptions {
  namespace: string;
  limit: number;
  windowMs: number;
  identifier?: string;
  maxKeys?: number;
}

const DEFAULT_MAX_KEYS = 10_000;
const namespaceBuckets = new Map<string, Map<string, Bucket>>();

function getNamespaceBuckets(namespace: string): Map<string, Bucket> {
  let buckets = namespaceBuckets.get(namespace);
  if (!buckets) {
    buckets = new Map<string, Bucket>();
    namespaceBuckets.set(namespace, buckets);
  }
  return buckets;
}

function evictOverflow(
  buckets: Map<string, Bucket>,
  maxKeys: number,
  now: number,
) {
  if (buckets.size < maxKeys) return;

  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }

  // Still full of live buckets: drop oldest insertion order so memory stays bounded.
  while (buckets.size >= maxKeys) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

function resolveClientKey(headers?: Headers): string {
  if (!headers) return "unknown";
  // Non-production load tests can simulate distinct clients without weakening production spoofing guards.
  if (process.env.NODE_ENV !== "production") {
    const simulated = headers.get("x-simulated-client-ip")?.trim();
    if (simulated) return simulated;
  }

  return getClientIp(headers) || "unknown";
}

export function checkRateLimit(
  request: { headers?: Headers },
  options: RateLimitOptions,
  now = Date.now(),
): { limited: boolean; retryAfterSec: number } {
  const buckets = getNamespaceBuckets(options.namespace);
  const key = options.identifier ?? resolveClientKey(request?.headers);
  const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    evictOverflow(buckets, maxKeys, now);
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { limited: false, retryAfterSec: 0 };
  }

  if (existing.count >= options.limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000),
    );
    return { limited: true, retryAfterSec };
  }

  existing.count += 1;
  return { limited: false, retryAfterSec: 0 };
}

export function enforceRateLimit(
  request: { headers?: Headers },
  options: RateLimitOptions,
): NextResponse | null {
  const { limited, retryAfterSec } = checkRateLimit(request, options);
  if (!limited) return null;

  return apiError("Too many requests. Please try again shortly.", 429, {
    "Retry-After": String(retryAfterSec),
  });
}
