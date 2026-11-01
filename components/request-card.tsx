"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, CalendarDays, RotateCcw, Save, Trash2 } from "lucide-react"
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  REQUEST_STATUSES,
  type ActorRole,
  type RequestItem,
  type RequestUpdate,
} from "@/lib/demands"

type RequestCardProps = {
  request: RequestItem
  isDesigner: boolean
  currentName: string
  onUpdate: (id: string, update: RequestUpdate) => Promise<void>
  onCancel: (id: string, actorName: string, actorRole: ActorRole) => Promise<void>
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

export function RequestCard({ request, isDesigner, currentName, onUpdate, onCancel }: RequestCardProps) {
  const [deliveryUrl, setDeliveryUrl] = useState(request.deliveryUrl ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const isLate = Boolean(request.dueDate && request.dueDate < localDateString() && request.status !== "concluido")
  const isOwnRequest = currentName.trim().toLocaleLowerCase("pt-BR") === request.requestedBy.trim().toLocaleLowerCase("pt-BR")

  useEffect(() => {
    setDeliveryUrl(request.deliveryUrl ?? "")
  }, [request.deliveryUrl])

  async function saveDelivery() {
    setIsSaving(true)
    await onUpdate(request.id, {
      actorName: "Gustavo",
      actorRole: "designer",
      deliveryUrl: deliveryUrl.trim(),
    })
    setIsSaving(false)
  }

  function cancelRequest() {
    if (!window.confirm(`Cancelar “${request.title}”?`)) return
    void onCancel(request.id, currentName, "solicitante")
  }

  return (
    <article className={`request-card${request.status === "concluido" ? " request-card-done" : ""}`}>
      <div className="request-card-topline">
        <span className={`status-badge status-${request.status}`}>
          <span className="status-dot" aria-hidden="true" />
          {STATUS_LABELS[request.status]}
        </span>
        <span className={`priority-badge priority-${request.priority}`}>
          <span className="priority-marker" aria-hidden="true" />
          {PRIORITY_LABELS[request.priority] ?? "Normal"}
        </span>
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

      {isDesigner ? (
        <div className="designer-controls">
          <div className="field-row controls-row">
            <label className="field compact-field">
              <span>Andamento</span>
              <select
                aria-label={`Andamento de ${request.title}`}
                value={request.status}
                onChange={(event) => void onUpdate(request.id, {
                  actorName: "Gustavo",
                  actorRole: "designer",
                  status: event.target.value as RequestItem["status"],
                })}
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
                onChange={(event) => void onUpdate(request.id, {
                  actorName: "Gustavo",
                  actorRole: "designer",
                  priority: Number(event.target.value),
                })}
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
          {isOwnRequest && request.status === "concluido" && (
            <button className="button button-subtle" type="button" onClick={() => void onUpdate(request.id, {
              actorName: currentName,
              actorRole: "solicitante",
              adjustment: true,
            })}>
              <RotateCcw size={15} aria-hidden="true" />
              Pedir ajuste
            </button>
          )}
          {isOwnRequest && request.status === "pedido" && (
            <button className="button button-danger" type="button" onClick={cancelRequest}>
              <Trash2 size={15} aria-hidden="true" />
              Cancelar pedido
            </button>
          )}
        </div>
      )}
    </article>
  )
}
