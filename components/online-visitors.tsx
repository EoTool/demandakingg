"use client"

import { UsersRound } from "lucide-react"

type OnlineVisitorsPanelProps = {
  visitors: OnlineVisitor[]
  isLoading: boolean
  hasError: boolean
}

export type OnlineVisitor = {
  id: string
  displayName: string
  lastSeenAt: string
}

function formatLastSeen(value: string) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 60) return "ativo agora"
  return `há ${Math.floor(elapsedSeconds / 60)} min`
}

export function OnlineVisitorsPanel({ visitors, isLoading, hasError }: OnlineVisitorsPanelProps) {
  return (
    <section className="online-visitors-panel" aria-labelledby="online-visitors-title">
      <div className="online-panel-heading">
        <div>
          <p className="eyebrow">ACOMPANHAMENTO / AO VIVO</p>
          <h3 id="online-visitors-title">Quem está no site</h3>
        </div>
        <span className="online-count">
          <span className="online-status-dot" aria-hidden="true" />
          {visitors.length} online
        </span>
      </div>

      {hasError && <p className="online-error" role="status">A lista não pôde ser atualizada.</p>}
      {isLoading && visitors.length === 0 ? (
        <p className="online-empty" role="status">Verificando presença agora…</p>
      ) : visitors.length > 0 ? (
        <ul className="online-visitors-list" aria-label="Visitantes ativos">
          {visitors.map((visitor) => (
            <li className="online-visitor" key={visitor.id}>
              <span className="visitor-avatar" aria-hidden="true">{visitor.displayName.slice(0, 1).toLocaleUpperCase("pt-BR")}</span>
              <span className="visitor-details">
                <strong>{visitor.displayName}</strong>
                <span>Visitante</span>
              </span>
              <time dateTime={visitor.lastSeenAt}>{formatLastSeen(visitor.lastSeenAt)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <div className="online-empty">
          <span className="online-empty-icon"><UsersRound size={17} aria-hidden="true" /></span>
          <p>Nenhum visitante ativo no momento.</p>
        </div>
      )}
    </section>
  )
}
