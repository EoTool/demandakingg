"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { ActivityTimeline } from "@/components/activity-timeline"
import { AdminAccessDialog } from "@/components/admin-access-dialog"
import { Brand } from "@/components/brand"
import { OnlineVisitorsPanel, type OnlineVisitor } from "@/components/online-visitors"
import { RequestCard } from "@/components/request-card"
import { RequestForm } from "@/components/request-form"
import { VisitorNameDialog } from "@/components/visitor-name-dialog"
import {
  REQUEST_CATEGORIES,
  type CreateRequestInput,
  type RequestStatus,
  type RequestUpdate,
  type RequestsPayload,
} from "@/lib/demands"
import {
  ArrowUpRight,
  Check,
  Eye,
  History,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Search,
  ShieldCheck,
} from "lucide-react"

type ViewMode = "team" | "designer"
type PageTab = "demands" | "history"
type StatusFilter = "todos" | RequestStatus | "atrasadas"
type Notice = { tone: "success" | "error"; message: string }
type AdminSessionPayload = { authenticated: boolean; name: string | null }
type VisitorPresencePayload = { visitorName: string | null }
type AdminPresencePayload = { visitors: OnlineVisitor[] }

const fetcher = async (url: string): Promise<RequestsPayload> => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Não foi possível carregar as demandas.")
  return response.json()
}

const sessionFetcher = async (url: string): Promise<AdminSessionPayload> => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Não foi possível validar o acesso administrativo.")
  return response.json()
}

const presenceFetcher = async (url: string): Promise<VisitorPresencePayload> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error ?? "Não foi possível registrar sua presença.")
  return result as VisitorPresencePayload
}

const adminPresenceFetcher = async (url: string): Promise<AdminPresencePayload> => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Não foi possível carregar os visitantes online.")
  return response.json()
}

class ActionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = "ActionError"
  }
}

async function sendJson(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const response = await fetch(url, {
    method,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    cache: "no-store",
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new ActionError(result?.error ?? "Não foi possível concluir a ação.", response.status)
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const { data, error, isLoading, mutate } = useSWR<RequestsPayload>("/api/requests", fetcher, {
    refreshInterval: 20_000,
    revalidateOnFocus: true,
  })
  const { data: adminSession, mutate: mutateAdminSession } = useSWR<AdminSessionPayload>(
    "/api/admin/session",
    sessionFetcher,
    { revalidateOnFocus: true, revalidateOnReconnect: true },
  )
  const isAdmin = adminSession?.authenticated === true
  const isDesigner = isAdmin && view === "designer"
  const {
    data: visitorPresence,
    isLoading: isPresenceLoading,
    mutate: mutateVisitorPresence,
  } = useSWR<VisitorPresencePayload>("/api/presence", presenceFetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const {
    data: adminPresence,
    error: adminPresenceError,
  } = useSWR<AdminPresencePayload>(isAdmin ? "/api/admin/presence" : null, adminPresenceFetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  const requests = data?.requests ?? []
  const activity = data?.activity ?? []
  const visitorName = visitorPresence?.visitorName ?? ""
  const onlineVisitors = adminPresence?.visitors ?? []
  const isOnlinePresenceLoading = isAdmin && !adminPresence && !adminPresenceError
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
      if (cause instanceof ActionError && cause.status === 401) {
        setView("team")
        void mutateAdminSession()
      }
      setNotice({ tone: "error", message: cause instanceof Error ? cause.message : "Não foi possível atualizar a demanda." })
    }
  }

  async function deleteRequest(id: string) {
    setNotice(null)
    try {
      await sendJson(`/api/requests/${id}`, "DELETE")
      await mutate()
      setNotice({ tone: "success", message: "Demanda removida da fila." })
    } catch (cause) {
      if (cause instanceof ActionError && cause.status === 401) {
        setView("team")
        void mutateAdminSession()
      }
      setNotice({ tone: "error", message: cause instanceof Error ? cause.message : "Não foi possível remover a demanda." })
    }
  }

  async function handleVisitorRegistration(name: string) {
    const response = await fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
      cache: "no-store",
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) throw new Error(result?.error ?? "Não foi possível registrar seu nome.")

    const payload = result as VisitorPresencePayload
    if (!payload.visitorName) throw new Error("Informe seu nome para continuar.")
    await mutateVisitorPresence(payload, { revalidate: false })
  }

  async function handleAdminLogin() {
    await mutateAdminSession()
    setView("designer")
    setIsAdminDialogOpen(false)
    setNotice({ tone: "success", message: "Acesso administrativo iniciado." })
  }

  async function handleAdminLogout() {
    setNotice(null)
    try {
      await sendJson("/api/admin/session", "DELETE")
      setView("team")
      await mutateAdminSession()
      setNotice({ tone: "success", message: "Sessão administrativa encerrada." })
    } catch (cause) {
      setNotice({ tone: "error", message: cause instanceof Error ? cause.message : "Não foi possível encerrar a sessão." })
    }
  }

  function openAdminArea() {
    if (!isAdmin) {
      setIsAdminDialogOpen(true)
      return
    }
    setView(isDesigner ? "team" : "designer")
  }

  if (isPresenceLoading && !visitorPresence) {
    return (
      <main className="visitor-loading-screen" role="status" aria-live="polite">
        <Brand compact />
        <span>Preparando sua central de criação…</span>
      </main>
    )
  }

  if (!visitorName) {
    return (
      <main className="visitor-entry-shell">
        <header className="visitor-entry-brand"><Brand /></header>
        <VisitorNameDialog open onSubmit={handleVisitorRegistration} />
      </main>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav className="primary-nav" aria-label="Navegação principal">
          <button className={tab === "demands" ? "primary-nav-active" : ""} type="button" onClick={() => setTab("demands")} aria-current={tab === "demands" ? "page" : undefined}>
            <LayoutDashboard size={15} aria-hidden="true" /> Demandas <span className="nav-count">{counts.todos}</span>
          </button>
          <button className={tab === "history" ? "primary-nav-active" : ""} type="button" onClick={() => setTab("history")} aria-current={tab === "history" ? "page" : undefined}>
            <History size={15} aria-hidden="true" /> Histórico
          </button>
        </nav>
        <div className="topbar-actions">
          <span className="access-state">
            <span className={`indicator-dot${isAdmin ? " indicator-dot-admin" : ""}`} aria-hidden="true" />
            {isAdmin ? "Gustavo / admin" : `Olá, ${visitorName}`}
          </span>
          <button className="button button-admin" type="button" onClick={openAdminArea}>
            {!isAdmin ? <LockKeyhole size={15} aria-hidden="true" /> : isDesigner ? <Eye size={15} aria-hidden="true" /> : <ShieldCheck size={15} aria-hidden="true" />}
            {!isAdmin ? "Entrar como Gustavo" : isDesigner ? "Visão da equipe" : "Abrir painel"}
          </button>
          {isAdmin && (
            <button className="button button-logout" type="button" onClick={() => void handleAdminLogout()} aria-label="Encerrar sessão administrativa">
              <LogOut size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        <h1 id="page-title" className="sr-only">
          {tab === "history" ? "Histórico de criação" : "Demandas de criação"}
        </h1>

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
                { id: "todos" as const, label: "Todas as demandas", value: counts.todos },
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
                  <strong>{String(item.value).padStart(2, "0")}</strong>
                </button>
              ))}
            </section>

            <div className="workspace-grid">
              <section className="board-section" aria-labelledby="queue-title">
                <div className="board-heading">
                  <div>
                    <p className="eyebrow">FILA DE PRODUÇÃO <span className="eyebrow-number">/ 01</span></p>
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
                        isAdmin={isDesigner}
                        onUpdate={updateRequest}
                        onDelete={deleteRequest}
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
                  <>
                    <section className="designer-panel">
                    <p className="eyebrow">PAINEL DO DESIGNER <span className="eyebrow-number">/ G</span></p>
                    <h2>Olá, Gustavo<span>.</span></h2>
                    <p className="designer-panel-copy">Gerencie status e prioridades, remova demandas e compartilhe as entregas finais.</p>
                    <div className="designer-summary">
                      <div><span>Na fila</span><strong>{String(counts.pedido).padStart(2, "0")}</strong></div>
                      <div><span>Em criação</span><strong>{String(counts.produzindo).padStart(2, "0")}</strong></div>
                      <div><span>Entregues</span><strong>{String(counts.concluido).padStart(2, "0")}</strong></div>
                    </div>
                    <div className="designer-tip"><span className="tip-mark"><Check size={15} aria-hidden="true" /></span><p>As alterações ficam registradas no histórico da equipe.</p></div>
                    <button className="button button-text-action" type="button" onClick={() => setTab("history")}>
                      Ver histórico <ArrowUpRight size={16} aria-hidden="true" />
                    </button>
                  </section>
                    <OnlineVisitorsPanel
                      visitors={onlineVisitors}
                      isLoading={isOnlinePresenceLoading}
                      hasError={Boolean(adminPresenceError)}
                    />
                  </>
                ) : (
                  <RequestForm
                    requesterName={visitorName}
                    onCreate={createRequest}
                    isSubmitting={isSubmitting}
                  />
                )}
                <div className="side-note">
                  <span className="side-note-mark">i</span>
                  <p>{isDesigner ? "A lista atualiza automaticamente enquanto as pessoas navegam." : "Um briefing com objetivo, formato e referência ajuda a organizar a entrega."}</p>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <section className="history-section" aria-labelledby="history-title">
            <div className="board-heading history-heading">
              <div>
                <p className="eyebrow">REGISTRO DE ATIVIDADE <span className="eyebrow-number">/ 02</span></p>
                <h2 id="history-title">O que mudou</h2>
              </div>
              <span className="result-count">{activity.length} {activity.length === 1 ? "registro" : "registros"}</span>
            </div>
            <div className="activity-card"><ActivityTimeline items={activity} /></div>
          </section>
        )}

        <footer className="page-footer">
          <span><strong>KINGG</strong> <span className="footer-separator">/</span> fluxo criativo da Addex Company</span>
          <span><span className="footer-dot" /> Atualizado automaticamente</span>
        </footer>
      </main>

      <AdminAccessDialog
        open={isAdminDialogOpen}
        onClose={() => setIsAdminDialogOpen(false)}
        onAuthenticated={handleAdminLogin}
      />
    </div>
  )
}
