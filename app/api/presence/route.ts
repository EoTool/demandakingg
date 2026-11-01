import { createHash, randomBytes } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { ADMIN_WORKSPACE_ID, getAdminCookieOptions, isSameOriginRequest } from "@/lib/admin-auth"
import { db } from "@/lib/db"
import { siteVisitors } from "@/lib/db/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VISITOR_COOKIE = "kingg_site_visitor"
const VISITOR_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" }
const presenceSchema = z.object({ name: z.string().trim().min(1).max(80).nullish() }).strict()

function hashVisitorToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function jsonPresence(visitorName: string | null, status = 200) {
  return NextResponse.json({ visitorName }, { status, headers: noStoreHeaders })
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403, headers: noStoreHeaders })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Envie os dados em JSON." }, { status: 400, headers: noStoreHeaders })
  }

  const parsed = presenceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Informe seu nome para continuar." },
      { status: 400, headers: noStoreHeaders },
    )
  }

  try {
    const cookieStore = await cookies()
    const cookieToken = cookieStore.get(VISITOR_COOKIE)?.value
    const tokenHash = cookieToken ? hashVisitorToken(cookieToken) : null
    const now = new Date()

    if (tokenHash) {
      const [existingVisitor] = await db
        .select({ displayName: siteVisitors.displayName })
        .from(siteVisitors)
        .where(and(eq(siteVisitors.userId, ADMIN_WORKSPACE_ID), eq(siteVisitors.tokenHash, tokenHash)))
        .limit(1)

      if (existingVisitor) {
        const displayName = parsed.data.name ?? existingVisitor.displayName
        await db
          .update(siteVisitors)
          .set({ displayName, lastSeenAt: now })
          .where(and(eq(siteVisitors.userId, ADMIN_WORKSPACE_ID), eq(siteVisitors.tokenHash, tokenHash)))
        return jsonPresence(displayName)
      }
    }

    if (!parsed.data.name) return jsonPresence(null)

    const visitorToken = cookieToken ?? randomBytes(32).toString("base64url")
    const visitorTokenHash = hashVisitorToken(visitorToken)
    const [visitor] = await db
      .insert(siteVisitors)
      .values({
        userId: ADMIN_WORKSPACE_ID,
        tokenHash: visitorTokenHash,
        displayName: parsed.data.name,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: [siteVisitors.userId, siteVisitors.tokenHash],
        set: { displayName: parsed.data.name, lastSeenAt: now },
      })
      .returning({ displayName: siteVisitors.displayName })

    const response = NextResponse.json({ visitorName: visitor.displayName }, { headers: noStoreHeaders })
    if (!cookieToken) {
      response.cookies.set(VISITOR_COOKIE, visitorToken, {
        ...getAdminCookieOptions(request),
        maxAge: VISITOR_COOKIE_TTL_SECONDS,
      })
    }
    return response
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar sua presença agora." }, { status: 503, headers: noStoreHeaders })
  }
}
