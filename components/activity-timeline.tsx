import { Activity, Clock3 } from "lucide-react"
import type { ActivityItem } from "@/lib/demands"

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="empty-state activity-empty">
        <span className="empty-icon"><Activity size={20} aria-hidden="true" /></span>
        <h3>Nenhuma atividade ainda</h3>
        <p>Quando alguém abrir ou atualizar uma demanda, ela aparece aqui.</p>
      </div>
    )
  }

  return (
    <ol className="activity-list" aria-label="Atividades recentes">
      {items.map((item) => (
        <li className="activity-item" key={item.id}>
          <span className="activity-marker" aria-hidden="true"><span /></span>
          <div className="activity-copy">
            <p><strong>{item.actorName}</strong> <span className={`activity-role role-${item.actorRole}`}>{item.actorRole === "designer" ? "Designer" : "Solicitante"}</span></p>
            <p>{item.action}</p>
          </div>
          <time dateTime={item.createdAt}><Clock3 size={13} aria-hidden="true" />{new Date(item.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
        </li>
      ))}
    </ol>
  )
}
