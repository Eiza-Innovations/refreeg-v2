import * as jose from "jose";

function getEncodedSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be configured in production");
    }
    return new TextEncoder().encode("development-secret-key-123456789");
  }
  return new TextEncoder().encode(secret);
}

export interface MobileJwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Sign a new JWT token for a mobile user
 * Expires in 30 days
 */
export async function signMobileToken(
  userId: string,
  email: string,
): Promise<string> {
  const jwt = await new jose.SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getEncodedSecret());

  return jwt;
}

/**
 * Verify a mobile JWT token
 * Returns the payload if valid, throws if invalid or expired
 */
export async function verifyMobileToken(
  token: string,
): Promise<MobileJwtPayload> {
  try {
    const { payload } = await jose.jwtVerify(token, getEncodedSecret(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string"
    ) {
      throw new Error("Invalid token payload");
    }
    return payload as unknown as MobileJwtPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Refresh an existing mobile token
 * Issues a new token with a fresh 30-day expiration if the current one is valid
 */
export async function refreshMobileToken(token: string): Promise<string> {
  const payload = await verifyMobileToken(token);
  return signMobileToken(payload.userId, payload.email);
}
