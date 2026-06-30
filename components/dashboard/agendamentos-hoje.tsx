"use client"

import { useTransition } from "react"
import { Clock, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { registrarPagamentoAgendamento } from "@/app/dashboard/agendamentos/actions"

type Agendamento = {
  id: string
  inicioHora: string
  fimHora: string
  status: string
  tipo: string
  valor: string | null
  observacao: string | null
  clienteNome: string | null
  pagamentoRegistrado: boolean
  formaPagamento: string | null
}

export function AgendamentosHoje({ agendamentos }: { agendamentos: Agendamento[] }) {
  const [pending, startTransition] = useTransition()

  if (agendamentos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Nenhum agendamento para hoje.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {agendamentos.map((ag) => {
        const nome = ag.clienteNome ?? ag.observacao ?? "Avulso"
        const tipo = ag.tipo === "MENSALISTA" ? "Mensalista" : "Avulso"
        const pago = ag.status === "PAGO" || ag.pagamentoRegistrado
        return (
          <div
            key={ag.id}
            className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-secondary/50"
          >
            <div className="flex items-center gap-1.5 text-primary shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-sm font-semibold w-10">{ag.inicioHora}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{nome}</p>
              <p className="text-xs text-muted-foreground">até {ag.fimHora}</p>
            </div>
            <Badge
              variant="outline"
              className={
                tipo === "Mensalista"
                  ? "border-primary/30 text-primary text-xs"
                  : "border-border text-muted-foreground text-xs"
              }
            >
              {tipo}
            </Badge>
            {ag.valor != null && (
              <span className="text-sm font-medium text-foreground shrink-0">
                R$ {Number(ag.valor).toFixed(2).replace(".", ",")}
              </span>
            )}
            {pago ? (
              <div className="flex items-center gap-1 text-green-600 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">Pago</span>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                className="shrink-0 h-7 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() =>
                  startTransition(async () => {
                    await registrarPagamentoAgendamento(ag.id)
                  })
                }
              >
                Pago
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
