import { and, desc, eq, gt } from "drizzle-orm"
import { NextResponse } from "next/server"
import { ADMIN_WORKSPACE_ID, getAdminSession } from "@/lib/admin-auth"
import { db } from "@/lib/db"
import { siteVisitors } from "@/lib/db/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" }
const ONLINE_WINDOW_MS = 90_000

export async function GET() {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401, headers: noStoreHeaders })
    }

    const activeSince = new Date(Date.now() - ONLINE_WINDOW_MS)
    const visitors = await db
      .select({
        id: siteVisitors.id,
        displayName: siteVisitors.displayName,
        lastSeenAt: siteVisitors.lastSeenAt,
      })
      .from(siteVisitors)
      .where(and(eq(siteVisitors.userId, ADMIN_WORKSPACE_ID), gt(siteVisitors.lastSeenAt, activeSince)))
      .orderBy(desc(siteVisitors.lastSeenAt))
      .limit(100)

    return NextResponse.json({ visitors }, { headers: noStoreHeaders })
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os visitantes online." }, { status: 503, headers: noStoreHeaders })
  }
}
