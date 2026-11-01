import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { and, eq, lt } from "drizzle-orm"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  ADMIN_WORKSPACE_ID,
  getAdminCookieOptions,
  getAdminSession,
  hashAdminSessionToken,
  isSameOriginRequest,
} from "@/lib/admin-auth"
import { db } from "@/lib/db"
import { adminSessions } from "@/lib/db/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" }
const loginSchema = z.object({ key: z.string().min(1).max(256) }).strict()

function matchesAdminKey(candidate: string, configuredKey: string) {
  const candidateDigest = createHash("sha256").update(candidate).digest()
  const configuredDigest = createHash("sha256").update(configuredKey).digest()
  return timingSafeEqual(candidateDigest, configuredDigest)
}

export async function GET() {
  try {
    const session = await getAdminSession()
    return NextResponse.json(
      { authenticated: Boolean(session), name: session?.name ?? null },
      { headers: noStoreHeaders },
    )
  } catch {
    return NextResponse.json({ error: "Não foi possível validar o acesso." }, { status: 503, headers: noStoreHeaders })
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403, headers: noStoreHeaders })
  }

  const configuredKey = process.env.KINGG_ADMIN_KEY
  if (!configuredKey) {
    return NextResponse.json({ error: "Acesso administrativo indisponível." }, { status: 503, headers: noStoreHeaders })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Confira a chave informada." }, { status: 400, headers: noStoreHeaders })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success || !matchesAdminKey(parsed.data.key, configuredKey)) {
    return NextResponse.json({ error: "Chave incorreta." }, { status: 401, headers: noStoreHeaders })
  }

  try {
    const token = randomBytes(32).toString("base64url")
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000)

    await db.delete(adminSessions).where(
      and(eq(adminSessions.userId, ADMIN_WORKSPACE_ID), lt(adminSessions.expiresAt, new Date())),
    )
    await db.insert(adminSessions).values({
      userId: ADMIN_WORKSPACE_ID,
      tokenHash: hashAdminSessionToken(token),
      expiresAt,
    })

    const response = NextResponse.json({ authenticated: true, name: "Gustavo" }, { headers: noStoreHeaders })
    response.cookies.set(ADMIN_SESSION_COOKIE, token, getAdminCookieOptions(request))
    return response
  } catch {
    return NextResponse.json({ error: "Não foi possível iniciar a sessão." }, { status: 503, headers: noStoreHeaders })
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403, headers: noStoreHeaders })
  }

  try {
    const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
    if (token) {
      await db
        .delete(adminSessions)
        .where(
          and(
            eq(adminSessions.userId, ADMIN_WORKSPACE_ID),
            eq(adminSessions.tokenHash, hashAdminSessionToken(token)),
          ),
        )
    }

    const response = NextResponse.json({ authenticated: false }, { headers: noStoreHeaders })
    response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...getAdminCookieOptions(request), maxAge: 0 })
    return response
  } catch {
    return NextResponse.json({ error: "Não foi possível encerrar a sessão." }, { status: 503, headers: noStoreHeaders })
  }
}
