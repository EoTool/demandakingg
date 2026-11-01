export const REQUEST_CATEGORIES = [
  "Identidade visual",
  "Redes sociais",
  "Material comercial",
  "Apresentação",
  "Design de interface",
  "Outro",
] as const

export const REQUEST_STATUSES = ["pedido", "produzindo", "concluido"] as const

export type RequestCategory = (typeof REQUEST_CATEGORIES)[number]
export type RequestStatus = (typeof REQUEST_STATUSES)[number]
export type ActorRole = "solicitante" | "designer"

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pedido: "Aguardando",
  produzindo: "Em criação",
  concluido: "Entregue",
}

export const PRIORITY_LABELS = ["Urgente", "Alta", "Normal", "Baixa"] as const

export type RequestItem = {
  id: string
  title: string
  description: string
  category: RequestCategory
  priority: number
  status: RequestStatus
  dueDate: string | null
  referenceUrl: string | null
  deliveryUrl: string | null
  requestedBy: string
  createdAt: string
  updatedAt: string
}

export type ActivityItem = {
  id: string
  requestId: string
  actorName: string
  actorRole: ActorRole
  action: string
  createdAt: string
}

export type RequestsPayload = {
  requests: RequestItem[]
  activity: ActivityItem[]
}

export type CreateRequestInput = {
  requesterName: string
  title: string
  description: string
  category: RequestCategory
  priority: number
  dueDate: string
  referenceUrl: string
}

export type RequestUpdate = {
  status?: RequestStatus
  priority?: number
  deliveryUrl?: string
}
