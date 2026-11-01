"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowRight, KeyRound, X } from "lucide-react"

type AdminAccessDialogProps = {
  open: boolean
  onClose: () => void
  onAuthenticated: () => Promise<void>
}

export function AdminAccessDialog({ open, onClose, onAuthenticated }: AdminAccessDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [key, setKey] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function closeDialog() {
    setKey("")
    setError("")
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
        cache: "no-store",
      })

      if (!response.ok) {
        setError(response.status === 401 ? "Chave incorreta. Tente novamente." : "Não foi possível iniciar a sessão.")
        return
      }

      setKey("")
      await onAuthenticated()
    } catch {
      setError("Não foi possível conectar ao painel. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="admin-dialog"
      aria-labelledby="admin-dialog-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        closeDialog()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog()
      }}
    >
      <div className="dialog-topline">
        <span><KeyRound size={15} aria-hidden="true" /> ACESSO RESTRITO</span>
        <button className="dialog-close" type="button" onClick={closeDialog} aria-label="Fechar">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="dialog-content">
        <p className="eyebrow">KINGG / ADMINISTRAÇÃO</p>
        <h2 id="admin-dialog-title">Área do Gustavo<span>.</span></h2>
        <p className="dialog-intro">Informe sua chave para atualizar o andamento e gerenciar as demandas.</p>
        <form onSubmit={handleSubmit}>
          <label className="field" htmlFor="admin-key">
            <span>Chave de acesso</span>
            <input
              id="admin-key"
              name="key"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={key}
              onChange={(event) => setKey(event.target.value)}
              required
              maxLength={256}
              aria-describedby={error ? "admin-key-error" : undefined}
              placeholder="Digite sua chave"
            />
          </label>
          {error && <p className="dialog-error" id="admin-key-error" role="alert">{error}</p>}
          <button className="button button-primary dialog-submit" type="submit" disabled={isSubmitting || !key.length}>
            {isSubmitting ? "Validando…" : "Entrar no painel"}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
        <p className="dialog-footnote">A sessão administrativa expira após 8 horas.</p>
      </div>
    </dialog>
  )
}
