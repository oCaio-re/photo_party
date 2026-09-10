import { cookies } from "next/headers";
import crypto from "crypto";

export const ADMIN_COOKIE_NAME = "photo_party_admin_session";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "photo_party_secret_caio_sarah_2026_wedding";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export const ADMIN_USERS: Record<string, string> = {
  caio: "250150",
  sarah: "250150",
};

export interface AdminSession {
  username: string;
  role: "host";
  createdAt: number;
}

/**
 * Creates an HMAC-signed session string
 */
export function createSessionToken(username: string): string {
  const payload = JSON.stringify({
    username: username.charAt(0).toUpperCase() + username.slice(1).toLowerCase(),
    role: "host",
    createdAt: Date.now(),
  });
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

/**
 * Validates and decodes session token
 */
export function verifySessionToken(token: string): AdminSession | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encodedPayload, signature] = parts;

    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(encodedPayload)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payloadText = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const session: AdminSession = JSON.parse(payloadText);

    // Verify session age (max 30 days)
    if (Date.now() - session.createdAt > SESSION_MAX_AGE * 1000) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Server-side helper to read the current authenticated admin session
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}
