import { createHash } from "node:crypto"
import { and, eq, gt } from "drizzle-orm"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { adminSessions } from "@/lib/db/schema"

export const ADMIN_WORKSPACE_ID = "kingg-shared"
export const ADMIN_SESSION_COOKIE = "kingg_admin_session"
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8

export function hashAdminSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function getAdminSession() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
  if (!token) return null

  const [session] = await db
    .select({ id: adminSessions.id })
    .from(adminSessions)
    .where(
      and(
        eq(adminSessions.userId, ADMIN_WORKSPACE_ID),
        eq(adminSessions.tokenHash, hashAdminSessionToken(token)),
        gt(adminSessions.expiresAt, new Date()),
      ),
    )
    .limit(1)

  return session ? { name: "Gustavo" as const } : null
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin")
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (!origin || !host) return false

  try {
    const expectedHost = host.split(",")[0].trim().toLowerCase()
    return new URL(origin).host.toLowerCase() === expectedHost
  } catch {
    return false
  }
}

export function getAdminCookieOptions(request: Request) {
  const isDevelopment = process.env.NODE_ENV === "development"
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim()
  const isHttps =
    forwardedProtocol === "https" ||
    request.headers.get("origin")?.startsWith("https://") === true ||
    process.env.NODE_ENV === "production"

  return {
    httpOnly: true,
    secure: isDevelopment || isHttps,
    sameSite: isDevelopment ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  }
}
