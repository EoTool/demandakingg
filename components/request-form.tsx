"use client"

import { ArrowUpRight, Clock3 } from "lucide-react"
import { REQUEST_CATEGORIES, PRIORITY_LABELS, type CreateRequestInput } from "@/lib/demands"

type RequestFormProps = {
  requesterName: string
  onCreate: (input: CreateRequestInput) => Promise<boolean>
  isSubmitting: boolean
}

export function RequestForm({ requesterName, onCreate, isSubmitting }: RequestFormProps) {
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const created = await onCreate({
      requesterName: requesterName.trim(),
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      category: String(formData.get("category") ?? REQUEST_CATEGORIES[0]) as CreateRequestInput["category"],
      priority: Number(formData.get("priority") ?? 2),
      dueDate: String(formData.get("dueDate") ?? ""),
      referenceUrl: String(formData.get("referenceUrl") ?? "").trim(),
    })

    if (created) form.reset()
  }

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <div className="form-heading">
        <div>
          <p className="eyebrow">01 / NOVO PEDIDO</p>
          <h2>Abrir demanda</h2>
        </div>
        <span className="form-index">KINGG</span>
      </div>
      <p className="form-intro">Passe o contexto necessário para o Gustavo começar com clareza.</p>

      <label className="field">
        <span>Seu nome</span>
        <input
          name="requesterName"
          autoComplete="name"
          value={requesterName}
          readOnly
          aria-readonly="true"
          maxLength={80}
          required
        />
      </label>

      <label className="field">
        <span>Nome do pedido</span>
        <input name="title" required minLength={2} maxLength={120} placeholder="Ex.: Campanha de lançamento" />
      </label>

      <label className="field">
        <span>Briefing</span>
        <textarea
          name="description"
          maxLength={5000}
          rows={4}
          placeholder="Objetivo, formato, referências e qualquer detalhe importante."
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Categoria</span>
          <select name="category" defaultValue={REQUEST_CATEGORIES[0]}>
            {REQUEST_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Prioridade</span>
          <select name="priority" defaultValue="2">
            {PRIORITY_LABELS.map((priority, index) => (
              <option key={priority} value={index}>{priority}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Prazo desejado</span>
          <input name="dueDate" type="date" />
        </label>
        <label className="field">
          <span>Link de referência</span>
          <input name="referenceUrl" type="url" maxLength={2048} placeholder="https://" />
        </label>
      </div>

      <div className="form-footnote">
        <Clock3 size={15} aria-hidden="true" />
        <span>O prazo é uma referência para organizar a fila.</span>
      </div>

      <button className="button button-primary submit-button" type="submit" disabled={isSubmitting || !requesterName.trim()}>
        <span>{isSubmitting ? "Enviando…" : "Enviar solicitação"}</span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </button>
      <p className="form-microcopy">Os pedidos ficam visíveis para a equipe criativa.</p>
    </form>
  )
}
