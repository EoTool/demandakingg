import { index, pgTable, smallint, text, timestamp, uuid, date } from "drizzle-orm/pg-core"
import type { ActorRole, RequestStatus } from "@/lib/demands"

export const designRequests = pgTable(
  "design_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("userId").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    priority: smallint("priority").notNull().default(2),
    status: text("status").$type<RequestStatus>().notNull().default("pedido"),
    dueDate: date("due_date", { mode: "string" }),
    referenceUrl: text("reference_url"),
    deliveryUrl: text("delivery_url"),
    requestedBy: text("requested_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("design_requests_user_created_at_idx").on(table.userId, table.createdAt)],
)

export const designRequestActivity = pgTable(
  "design_request_activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("userId").notNull(),
    requestId: uuid("request_id").notNull(),
    actorName: text("actor_name").notNull(),
    actorRole: text("actor_role").$type<ActorRole>().notNull(),
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("design_request_activity_user_created_at_idx").on(table.userId, table.createdAt)],
)
