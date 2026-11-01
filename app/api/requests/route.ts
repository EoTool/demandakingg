import { and, desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { REQUEST_CATEGORIES } from "@/lib/demands"
import { db } from "@/lib/db"
import { designRequestActivity, designRequests } from "@/lib/db/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const WORKSPACE_ID = "kingg-shared"

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

const safeUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === "" || isHttpUrl(value), "Use um link http:// ou https://")

const createRequestSchema = z.object({
  requesterName: z.string().trim().min(1).max(80),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(5000).nullish().transform((value) => value ?? ""),
  category: z.enum(REQUEST_CATEGORIES),
  priority: z.coerce.number().int().min(0).max(3),
  dueDate: z
    .string()
    .trim()
    .refine((value) => value === "" || isValidDate(value), "Prazo inválido")
    .nullish()
    .transform((value) => value ?? ""),
  referenceUrl: safeUrlSchema.nullish().transform((value) => value ?? ""),
})

export async function GET() {
  try {
    const [requests, activity] = await Promise.all([
      db
        .select({
          id: designRequests.id,
          title: designRequests.title,
          description: designRequests.description,
          category: designRequests.category,
          priority: designRequests.priority,
          status: designRequests.status,
          dueDate: designRequests.dueDate,
          referenceUrl: designRequests.referenceUrl,
          deliveryUrl: designRequests.deliveryUrl,
          requestedBy: designRequests.requestedBy,
          createdAt: designRequests.createdAt,
          updatedAt: designRequests.updatedAt,
        })
        .from(designRequests)
        .where(eq(designRequests.userId, WORKSPACE_ID))
        .orderBy(desc(designRequests.createdAt)),
      db
        .select({
          id: designRequestActivity.id,
          requestId: designRequestActivity.requestId,
          actorName: designRequestActivity.actorName,
          actorRole: designRequestActivity.actorRole,
          action: designRequestActivity.action,
          createdAt: designRequestActivity.createdAt,
        })
        .from(designRequestActivity)
        .where(eq(designRequestActivity.userId, WORKSPACE_ID))
        .orderBy(desc(designRequestActivity.createdAt))
        .limit(200),
    ])

    return NextResponse.json({ requests, activity })
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as demandas." }, { status: 503 })
  }
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Envie os dados da demanda em JSON." }, { status: 400 })
  }

  const parsed = createRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Confira os campos da demanda." }, { status: 400 })
  }

  const input = parsed.data

  try {
    const created = await db.transaction(async (transaction) => {
      const [savedRequest] = await transaction
        .insert(designRequests)
        .values({
          userId: WORKSPACE_ID,
          requestedBy: input.requesterName,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          status: "pedido",
          dueDate: input.dueDate || null,
          referenceUrl: input.referenceUrl || null,
          deliveryUrl: null,
        })
        .returning({
          id: designRequests.id,
          title: designRequests.title,
          description: designRequests.description,
          category: designRequests.category,
          priority: designRequests.priority,
          status: designRequests.status,
          dueDate: designRequests.dueDate,
          referenceUrl: designRequests.referenceUrl,
          deliveryUrl: designRequests.deliveryUrl,
          requestedBy: designRequests.requestedBy,
          createdAt: designRequests.createdAt,
          updatedAt: designRequests.updatedAt,
        })

      await transaction.insert(designRequestActivity).values({
        userId: WORKSPACE_ID,
        requestId: savedRequest.id,
        actorName: input.requesterName,
        actorRole: "solicitante",
        action: `abriu a demanda “${input.title}”`,
      })

      return savedRequest
    })

    return NextResponse.json({ request: created }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar a demanda agora." }, { status: 503 })
  }
}
