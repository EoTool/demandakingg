"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowRight, UserRound } from "lucide-react"

type VisitorNameDialogProps = {
  open: boolean
  onSubmit: (name: string) => Promise<void>
}

export function VisitorNameDialog({ open, onSubmit }: VisitorNameDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      await onSubmit(name.trim())
      setName("")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar seu nome.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="admin-dialog visitor-dialog"
      aria-labelledby="visitor-dialog-title"
      onCancel={(event) => event.preventDefault()}
    >
      <div className="dialog-topline">
        <span><UserRound size={15} aria-hidden="true" /> IDENTIFICAÇÃO DA EQUIPE</span>
      </div>
      <div className="dialog-content">
        <p className="eyebrow">KINGG / CENTRAL DE CRIAÇÃO</p>
        <h2 id="visitor-dialog-title">Como podemos te chamar?</h2>
        <p className="dialog-intro">Seu nome ajuda a equipe a reconhecer quem está acompanhando os pedidos.</p>
        <form onSubmit={handleSubmit}>
          <label className="field" htmlFor="visitor-name">
            <span>Seu nome</span>
            <input
              id="visitor-name"
              name="name"
              type="text"
              autoComplete="name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={1}
              maxLength={80}
              aria-describedby={error ? "visitor-name-error" : "visitor-name-note"}
              placeholder="Digite seu nome"
            />
          </label>
          {error && <p className="dialog-error" id="visitor-name-error" role="alert">{error}</p>}
          <button className="button button-primary dialog-submit" type="submit" disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? "Salvando…" : "Entrar na central"}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
        <p className="dialog-footnote" id="visitor-name-note">O time vê seu nome enquanto você estiver ativo no site.</p>
      </div>
    </dialog>
  )
}
