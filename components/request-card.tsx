"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, CalendarDays, Save, Trash2 } from "lucide-react"
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  REQUEST_STATUSES,
  type RequestItem,
  type RequestUpdate,
} from "@/lib/demands"

type RequestCardProps = {
  request: RequestItem
  isAdmin: boolean
  onUpdate: (id: string, update: RequestUpdate) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function localDateString() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

function displayDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

function displayDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function RequestCard({ request, isAdmin, onUpdate, onDelete }: RequestCardProps) {
  const [deliveryUrl, setDeliveryUrl] = useState(request.deliveryUrl ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const isLate = Boolean(request.dueDate && request.dueDate < localDateString() && request.status !== "concluido")

  useEffect(() => {
    setDeliveryUrl(request.deliveryUrl ?? "")
  }, [request.deliveryUrl])

  async function saveDelivery() {
    setIsSaving(true)
    try {
      await onUpdate(request.id, { deliveryUrl: deliveryUrl.trim() })
    } finally {
      setIsSaving(false)
    }
  }

  function confirmDelete() {
    if (!window.confirm(`Excluir “${request.title}”? Esta ação não pode ser desfeita.`)) return
    void onDelete(request.id)
  }

  return (
    <article className={`request-card${request.status === "concluido" ? " request-card-done" : ""}`}>
      <div className="request-card-topline">
        <div className="request-badges">
          <span className={`status-badge status-${request.status}`}>
            <span className="status-dot" aria-hidden="true" />
            {STATUS_LABELS[request.status]}
          </span>
          <span className={`priority-badge priority-${request.priority}`}>
            <span className="priority-marker" aria-hidden="true" />
            {PRIORITY_LABELS[request.priority] ?? "Normal"}
          </span>
        </div>
        {isAdmin && (
          <button className="button button-danger" type="button" onClick={confirmDelete} aria-label={`Excluir demanda ${request.title}`}>
            <Trash2 size={14} aria-hidden="true" /> Excluir
          </button>
        )}
      </div>

      <div className="request-title-row">
        <h3>{request.title}</h3>
        <span className="request-category">{request.category}</span>
      </div>

      {request.description && <p className="request-description">{request.description}</p>}

      <div className="request-meta">
        <span><span className="meta-label">Por</span> {request.requestedBy}</span>
        <time dateTime={request.createdAt}>{displayDateTime(request.createdAt)}</time>
        {request.dueDate && (
          <span className={`request-deadline${isLate ? " request-deadline-late" : ""}`}>
            <CalendarDays size={14} aria-hidden="true" />
            {isLate ? "Atrasada · " : "Prazo · "}{displayDate(request.dueDate)}
          </span>
        )}
      </div>

      {(request.referenceUrl || request.deliveryUrl) && (
        <div className="request-links">
          {request.referenceUrl && (
            <a href={request.referenceUrl} target="_blank" rel="noopener noreferrer">
              Referência <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
          {request.deliveryUrl && (
            <a className="delivery-link" href={request.deliveryUrl} target="_blank" rel="noopener noreferrer">
              Ver entrega <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      {isAdmin ? (
        <div className="designer-controls">
          <div className="field-row controls-row">
            <label className="field compact-field">
              <span>Andamento</span>
              <select
                aria-label={`Andamento de ${request.title}`}
                value={request.status}
                onChange={(event) => void onUpdate(request.id, { status: event.target.value as RequestItem["status"] })}
              >
                {REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                ))}
              </select>
            </label>
            <label className="field compact-field">
              <span>Prioridade</span>
              <select
                aria-label={`Prioridade de ${request.title}`}
                value={request.priority}
                onChange={(event) => void onUpdate(request.id, { priority: Number(event.target.value) })}
              >
                {PRIORITY_LABELS.map((priority, index) => (
                  <option key={priority} value={index}>{priority}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="delivery-editor">
            <label className="field compact-field" htmlFor={`delivery-${request.id}`}>
              <span>Link da entrega</span>
              <input
                id={`delivery-${request.id}`}
                type="url"
                value={deliveryUrl}
                onChange={(event) => setDeliveryUrl(event.target.value)}
                placeholder="https://"
                maxLength={2048}
              />
            </label>
            <button className="button button-subtle save-link-button" type="button" onClick={() => void saveDelivery()} disabled={isSaving}>
              <Save size={15} aria-hidden="true" />
              {isSaving ? "Salvando" : "Salvar link"}
            </button>
          </div>
        </div>
      ) : (
        <div className="request-card-footer">
          <span className="request-status-copy">
            {request.status === "pedido" && "O pedido entrou na fila de criação."}
            {request.status === "produzindo" && "Gustavo está trabalhando nesta demanda."}
            {request.status === "concluido" && "A entrega está pronta para revisão."}
          </span>
        </div>
      )}
    </article>
  )
}
