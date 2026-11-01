"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { ActivityTimeline } from "@/components/activity-timeline"
import { Brand } from "@/components/brand"
import { RequestCard } from "@/components/request-card"
import { RequestForm } from "@/components/request-form"
import {
  REQUEST_CATEGORIES,
  type ActorRole,
  type CreateRequestInput,
  type RequestStatus,
  type RequestUpdate,
  type RequestsPayload,
} from "@/lib/demands"
import { ArrowLeft, ArrowUpRight, Check, Eye, History, LayoutDashboard, Search } from "lucide-react"

type ViewMode = "team" | "designer"
type PageTab = "demands" | "history"
type StatusFilter = "todos" | RequestStatus | "atrasadas"
type Notice = { tone: "success" | "error"; message: string }

const fetcher = async (url: string): Promise<RequestsPayload> => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Não foi possível carregar as demandas.")
  return response.json()
}

async function sendJson(url: string, method: "POST" | "PATCH" | "DELETE", body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error ?? "Não foi possível concluir a ação.")
}

function localDateString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function isOverdue(dueDate: string | null, status: RequestStatus) {
  return Boolean(dueDate && dueDate < localDateString() && status !== "concluido")
}

export function DemandDashboard() {
  const [view, setView] = useState<ViewMode>("team")
  const [tab, setTab] = useState<PageTab>("demands")
  const [filter, setFilter] = useState<StatusFilter>("todos")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const [requesterName, setRequesterName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const { data, error, isLoading, mutate } = useSWR<RequestsPayload>("/api/requests", fetcher, {
    refreshInterval: 20_000,
    revalidateOnFocus: true,
  })

  const requests = data?.requests ?? []
  const activity = data?.activity ?? []
  const counts = useMemo(() => ({
    todos: requests.length,
    pedido: requests.filter((request) => request.status === "pedido").length,
    produzindo: requests.filter((request) => request.status === "produzindo").length,
    concluido: requests.filter((request) => request.status === "concluido").length,
    atrasadas: requests.filter((request) => isOverdue(request.dueDate, request.status)).length,
  }), [requests])

  const visibleRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR")
    return requests
      .filter((request) => {
        if (filter === "atrasadas" && !isOverdue(request.dueDate, request.status)) return false
        if (filter !== "todos" && filter !== "atrasadas" && request.status !== filter) return false
        if (category && request.category !== category) return false
        if (normalizedQuery) {
          const searchable = `${request.title} ${request.description} ${request.requestedBy}`.toLocaleLowerCase("pt-BR")
          if (!searchable.includes(normalizedQuery)) return false
        }
        return true
      })
      .sort((first, second) => {
        const firstDone = first.status === "concluido" ? 1 : 0
        const secondDone = second.status === "concluido" ? 1 : 0
        if (firstDone !== secondDone) return firstDone - secondDone
        if (first.priority !== second.priority) return first.priority - second.priority
        const firstDue = first.dueDate ?? "9999-12-31"
        const secondDue = second.dueDate ?? "9999-12-31"
        if (firstDue !== secondDue) return firstDue.localeCompare(secondDue)
        return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
      })
  }, [requests, filter, category, query])

  async function createRequest(input: CreateRequestInput) {
    setIsSubmitting(true)
    setNotice(null)
    try {
      await sendJson("/api/requests", "POST", input)
      await mutate()
      setNotice({ tone: "success", message: "Pedido registrado na fila de criação." })
      return true
    } catch (cause) {
      setNotice({ tone: "error", message: cause instanceof Error ? cause.message : "Não foi possível enviar o pedido." })
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  async function updateRequest(id: string, update: RequestUpdate) {
    setNotice(null)
    try {
      await sendJson(`/api/requests/${id}`, "PATCH", update)
      await mutate()
      setNotice({ tone: "success", message: "Demanda atualizada." })
    } catch (cause) {
      setNotice({ tone: "error", message: cause instanceof Error ? cause.message : "Não foi possível atualizar a demanda." })
    }
  }

  async function cancelRequest(id: string, actorName: string, actorRole: ActorRole) {
    setNotice(null)
    try {
      await sendJson(`/api/requests/${id}`, "DELETE", { actorName, actorRole })
      await mutate()
      setNotice({ tone: "success", message: "Pedido cancelado." })
    } catch (cause) {
      setNotice({ tone: "error", message: cause instanceof Error ? cause.message : "Não foi possível cancelar o pedido." })
    }
  }

  const isDesigner = view === "designer"
  const pageTitle = tab === "history" ? "Histórico" : "Demandas de criação"

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">ESPAÇO DE TRABALHO</div>
        <div className="workspace-switcher">
          <span className="workspace-initial">K</span>
          <span className="workspace-copy"><strong>Addex Company</strong><small>Equipe de criação</small></span>
          <span className="workspace-status" aria-label="Ativo" />
        </div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          <span className="nav-section-label">CENTRAL</span>
          <button className={`nav-item${tab === "demands" ? " nav-item-active" : ""}`} type="button" onClick={() => setTab("demands")} aria-current={tab === "demands" ? "page" : undefined}>
            <LayoutDashboard size={18} aria-hidden="true" />
            <span>Demandas</span>
            <span className="nav-count">{counts.todos}</span>
          </button>
          <button className={`nav-item${tab === "history" ? " nav-item-active" : ""}`} type="button" onClick={() => setTab("history")} aria-current={tab === "history" ? "page" : undefined}>
            <History size={18} aria-hidden="true" />
            <span>Histórico</span>
          </button>
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-contact">
          <span className="contact-avatar">G</span>
          <span><strong>Gustavo</strong><small>Designer · Addex Company</small></span>
        </div>
        <p className="sidebar-footnote">KINGG <span>·</span> fluxo de criação</p>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div className="page-heading">
            <p className="eyebrow">ADDEX COMPANY <span>/</span> CRIAÇÃO</p>
            <h1>{pageTitle}</h1>
            <p className="page-subtitle">
              {tab === "history" ? "Acompanhe o que mudou na fila de criação." : "Pedidos claros, prazos visíveis e andamento em um só lugar."}
            </p>
          </div>
          <div className="header-actions">
            <span className={`view-indicator${isDesigner ? " view-indicator-designer" : ""}`}>
              <span className="indicator-dot" aria-hidden="true" />
              {isDesigner ? "Visão do designer" : "Equipe criativa"}
            </span>
            <button className="button button-mode" type="button" onClick={() => setView(isDesigner ? "team" : "designer")}>
              {isDesigner ? <ArrowLeft size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              {isDesigner ? "Voltar à equipe" : "Visão do Gustavo"}
            </button>
          </div>
        </header>

        {notice && (
          <div className={`notice notice-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
            {notice.tone === "success" ? <Check size={16} aria-hidden="true" /> : <span className="notice-mark" aria-hidden="true">!</span>}
            <span>{notice.message}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso">×</button>
          </div>
        )}
        {error && <div className="load-error" role="alert">Não foi possível conectar à fila. Atualize a página para tentar novamente.</div>}

        {tab === "demands" ? (
          <>
            <section className="stats-grid" aria-label="Resumo das demandas">
              {[
                { id: "todos" as const, label: "Total de pedidos", value: counts.todos },
                { id: "pedido" as const, label: "Aguardando", value: counts.pedido },
                { id: "produzindo" as const, label: "Em criação", value: counts.produzindo },
                { id: "concluido" as const, label: "Entregues", value: counts.concluido },
                { id: "atrasadas" as const, label: "Prazo vencido", value: counts.atrasadas },
              ].map((item) => (
                <button
                  className={`stat-card${filter === item.id ? " stat-card-active" : ""}${item.id === "atrasadas" && item.value > 0 ? " stat-card-attention" : ""}`}
                  type="button"
                  key={item.id}
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </button>
              ))}
            </section>

            <div className="workspace-grid">
              <section className="board-section" aria-labelledby="queue-title">
                <div className="board-heading">
                  <div>
                    <p className="eyebrow">FILA DE PRODUÇÃO</p>
                    <h2 id="queue-title">Pedidos da equipe</h2>
                  </div>
                  <span className="result-count">{visibleRequests.length} {visibleRequests.length === 1 ? "pedido" : "pedidos"}</span>
                </div>

                <div className="board-filters">
                  <label className="search-field">
                    <Search size={17} aria-hidden="true" />
                    <span className="sr-only">Buscar pedidos</span>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por pedido ou pessoa" />
                  </label>
                  <label className="category-filter">
                    <span className="sr-only">Filtrar por categoria</span>
                    <select value={category} onChange={(event) => setCategory(event.target.value)}>
                      <option value="">Todas as categorias</option>
                      {REQUEST_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                </div>

                {isLoading ? (
                  <div className="loading-list" aria-label="Carregando demandas">
                    <div className="loading-card" /><div className="loading-card" /><div className="loading-card" />
                  </div>
                ) : visibleRequests.length > 0 ? (
                  <div className="request-list">
                    {visibleRequests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        isDesigner={isDesigner}
                        currentName={isDesigner ? "Gustavo" : requesterName}
                        onUpdate={updateRequest}
                        onCancel={cancelRequest}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon"><LayoutDashboard size={20} aria-hidden="true" /></span>
                    <h3>{requests.length ? "Nenhum pedido encontrado" : "A fila começa por aqui"}</h3>
                    <p>{requests.length ? "Tente mudar a busca ou os filtros." : "Quando a equipe enviar uma solicitação, ela aparece nesta lista."}</p>
                    {filter !== "todos" && <button className="text-button" type="button" onClick={() => setFilter("todos")}>Limpar filtro</button>}
                  </div>
                )}
              </section>

              <aside className="side-panel" aria-label={isDesigner ? "Resumo de produção" : "Nova solicitação"}>
                {isDesigner ? (
                  <section className="designer-panel">
                    <p className="eyebrow">VISÃO DE PRODUÇÃO</p>
                    <h2>Olá, Gustavo.</h2>
                    <p className="designer-panel-copy">Atualize o andamento, ajuste prioridades e compartilhe os links finais por aqui.</p>
                    <div className="designer-summary">
                      <div><span>Na fila</span><strong>{counts.pedido}</strong></div>
                      <div><span>Em criação</span><strong>{counts.produzindo}</strong></div>
                      <div><span>Entregues</span><strong>{counts.concluido}</strong></div>
                    </div>
                    <div className="designer-tip"><span className="tip-mark"><Check size={15} aria-hidden="true" /></span><p>As mudanças de status ficam registradas no histórico para toda a equipe.</p></div>
                    <button className="button button-text-action" type="button" onClick={() => setTab("history")}>
                      Ver histórico <ArrowUpRight size={16} aria-hidden="true" />
                    </button>
                  </section>
                ) : (
                  <RequestForm
                    requesterName={requesterName}
                    onRequesterNameChange={setRequesterName}
                    onCreate={createRequest}
                    isSubmitting={isSubmitting}
                  />
                )}
                <div className="side-note">
                  <span className="side-note-mark">i</span>
                  <p>Um briefing com objetivo, formato e referência ajuda a organizar a entrega.</p>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <section className="history-section" aria-labelledby="history-title">
            <div className="board-heading history-heading">
              <div>
                <p className="eyebrow">REGISTRO DE ATIVIDADE</p>
                <h2 id="history-title">O que mudou</h2>
              </div>
              <span className="result-count">{activity.length} {activity.length === 1 ? "registro" : "registros"}</span>
            </div>
            <div className="activity-card"><ActivityTimeline items={activity} /></div>
          </section>
        )}

        <footer className="page-footer">
          <span>Feito para o fluxo criativo da Addex Company.</span>
          <span><span className="footer-dot" /> Atualizado automaticamente</span>
        </footer>
      </main>
    </div>
  )
}
