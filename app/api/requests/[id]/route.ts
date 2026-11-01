import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { REQUEST_STATUSES, STATUS_LABELS } from "@/lib/demands"
import { ADMIN_WORKSPACE_ID, getAdminSession, isSameOriginRequest } from "@/lib/admin-auth"
import { db } from "@/lib/db"
import { designRequestActivity, designRequests } from "@/lib/db/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const WORKSPACE_ID = ADMIN_WORKSPACE_ID
const uuidSchema = z.string().uuid()

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

const safeUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === "" || isHttpUrl(value), "Use um link http:// ou https://")

const updateSchema = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  deliveryUrl: safeUrlSchema.optional(),
}).strict()

async function authorizeAdmin(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 })
  }

  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 })
    }
    return null
  } catch {
    return NextResponse.json({ error: "Não foi possível validar o acesso." }, { status: 503 })
  }
}

async function parseRequestId(params: Promise<{ id: string }>) {
  const { id } = await params
  return uuidSchema.safeParse(id)
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorizationError = await authorizeAdmin(request)
  if (authorizationError) return authorizationError

  const idResult = await parseRequestId(context.params)
  if (!idResult.success) return NextResponse.json({ error: "Demanda inválida." }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Envie os dados da atualização em JSON." }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Confira os dados da atualização." }, { status: 400 })
  }

  const input = parsed.data
  if (input.status === undefined && input.priority === undefined && input.deliveryUrl === undefined) {
    return NextResponse.json({ error: "Nenhuma alteração foi enviada." }, { status: 400 })
  }

  try {
    const [current] = await db
      .select({
        id: designRequests.id,
        title: designRequests.title,
        status: designRequests.status,
        priority: designRequests.priority,
        deliveryUrl: designRequests.deliveryUrl,
      })
      .from(designRequests)
      .where(and(eq(designRequests.id, idResult.data), eq(designRequests.userId, WORKSPACE_ID)))
      .limit(1)

    if (!current) return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 })

    const updates: {
      status?: (typeof REQUEST_STATUSES)[number]
      priority?: number
      deliveryUrl?: string | null
      updatedAt?: Date
    } = {}
    const actions: string[] = []

    if (input.status && input.status !== current.status) {
      updates.status = input.status
      actions.push(`alterou “${current.title}” para ${STATUS_LABELS[input.status]}`)
    }
    if (input.priority !== undefined && input.priority !== current.priority) {
      updates.priority = input.priority
      actions.push(`ajustou a prioridade de “${current.title}”`)
    }
    if (input.deliveryUrl !== undefined) {
      const nextUrl = input.deliveryUrl || null
      if (nextUrl !== current.deliveryUrl) {
        updates.deliveryUrl = nextUrl
        actions.push(nextUrl ? `adicionou a entrega de “${current.title}”` : `removeu a entrega de “${current.title}”`)
      }
    }

    if (actions.length === 0) return NextResponse.json({ unchanged: true })
    updates.updatedAt = new Date()

    await db.transaction(async (transaction) => {
      await transaction
        .update(designRequests)
        .set(updates)
        .where(and(eq(designRequests.id, current.id), eq(designRequests.userId, WORKSPACE_ID)))

      await transaction.insert(designRequestActivity).values({
        userId: WORKSPACE_ID,
        requestId: current.id,
        actorName: "Gustavo",
        actorRole: "designer",
        action: actions.join(" · "),
      })
    })

    return NextResponse.json({ updated: true })
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar a demanda." }, { status: 503 })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorizationError = await authorizeAdmin(request)
  if (authorizationError) return authorizationError

  const idResult = await parseRequestId(context.params)
  if (!idResult.success) return NextResponse.json({ error: "Demanda inválida." }, { status: 400 })

  try {
    const [current] = await db
      .select({ id: designRequests.id, title: designRequests.title })
      .from(designRequests)
      .where(and(eq(designRequests.id, idResult.data), eq(designRequests.userId, WORKSPACE_ID)))
      .limit(1)

    if (!current) return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 })

    await db.transaction(async (transaction) => {
      await transaction.insert(designRequestActivity).values({
        userId: WORKSPACE_ID,
        requestId: current.id,
        actorName: "Gustavo",
        actorRole: "designer",
        action: `removeu “${current.title}”`,
      })
      await transaction
        .delete(designRequests)
        .where(and(eq(designRequests.id, current.id), eq(designRequests.userId, WORKSPACE_ID)))
    })

    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: "Não foi possível remover a demanda." }, { status: 503 })
  }
}
