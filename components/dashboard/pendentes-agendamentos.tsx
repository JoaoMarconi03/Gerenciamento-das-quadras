"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, XCircle, Clock, CalendarDays, User, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { aprovarAgendamento, cancelarAgendamento } from "@/app/dashboard/agendamentos/actions"

type Pendente = {
  id: string
  inicioHora: string  // "HH:MM" literal do banco via TO_CHAR
  fimHora:    string  // "HH:MM"
  inicioData: string  // "YYYY-MM-DD"
  observacao: string | null
  clienteNome: string | null
  quadraNome: string
}

export function PendentesAgendamentos({ pendentes }: { pendentes: Pendente[] }) {
  const [aberto, setAberto] = useState(true)
  const [processando, setProcessando] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function fmtData(inicioData: string) {
    if (!inicioData) return "—"
    const [y, mo, d] = inicioData.split("-").map(Number)
    return new Date(y, mo - 1, d).toLocaleDateString("pt-BR", {
      weekday: "short", day: "2-digit", month: "short",
    })
  }

  function handleAprovar(id: string) {
    setProcessando(id)
    startTransition(async () => {
      await aprovarAgendamento(id)
      setProcessando(null)
    })
  }

  function handleCancelar(id: string) {
    setProcessando(id)
    startTransition(async () => {
      await cancelarAgendamento(id)
      setProcessando(null)
    })
  }

  return (
    <div className="mx-4 lg:mx-6 mt-4 mb-2 rounded-xl border border-yellow-500/30 bg-yellow-500/5 overflow-hidden">
      {/* Header da seção */}
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-yellow-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold text-yellow-400">
            {pendentes.length} reserva{pendentes.length > 1 ? "s" : ""} aguardando aprovação
          </span>
        </div>
        {aberto ? (
          <ChevronUp className="w-4 h-4 text-yellow-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-yellow-400" />
        )}
      </button>

      {/* Lista de pendentes */}
      {aberto && (
        <div className="divide-y divide-yellow-500/10">
          {pendentes.map((p) => (
            <div key={p.id} className="px-4 py-3 space-y-3">
              {/* Info */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {p.clienteNome ?? "Cliente sem nome"}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <CalendarDays className="w-3 h-3 shrink-0" />
                    <span className="capitalize">{fmtData(p.inicioData)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="font-mono font-medium text-foreground/80">
                      {p.inicioHora} – {p.fimHora}
                    </span>
                    <span className="text-muted-foreground/50">•</span>
                    <span>{p.quadraNome}</span>
                  </div>
                  {p.observacao && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Obs: {p.observacao}
                    </p>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processando === p.id}
                  onClick={() => handleCancelar(p.id)}
                  className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Recusar
                </Button>
                <Button
                  size="sm"
                  disabled={processando === p.id}
                  onClick={() => handleAprovar(p.id)}
                  className="flex-1 bg-primary gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {processando === p.id ? "Salvando..." : "Aprovar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
