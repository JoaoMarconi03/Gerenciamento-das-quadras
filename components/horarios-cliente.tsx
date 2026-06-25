"use client"

import { useState, useEffect, useTransition } from "react"
import { format, addDays, subDays, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ChevronLeft, ChevronRight, Clock, Lock,
  CheckCircle2, AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { buscarOcupacoes, criarReserva } from "@/app/minha-conta/horarios/actions"

// ── Constantes ────────────────────────────────────────────────────────────────

const HOUR_START = 8
const HOUR_END   = 23

const DURACOES = [
  { min: 60,  label: "1 hora"  },
  { min: 90,  label: "1h 30"   },
  { min: 120, label: "2 horas" },
]

type Ocupacao = { inicio: string; fim: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function fmtMin(min: number) {
  return `${Math.floor(min / 60).toString().padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`
}

function adicionarMin(hhmm: string, min: number) {
  return fmtMin(toMin(hhmm) + min)
}

function slotEstaOcupado(slot: string, ocupacoes: Ocupacao[]) {
  const s = toMin(slot)
  return ocupacoes.some((o) => toMin(o.inicio) <= s && toMin(o.fim) > s)
}

function conflitosNoPeriodo(inicio: string, fim: string, ocupacoes: Ocupacao[]) {
  const s = toMin(inicio), e = toMin(fim)
  return ocupacoes.filter((o) => toMin(o.inicio) < e && toMin(o.fim) > s)
}

// ── Componente ────────────────────────────────────────────────────────────────

export function HorariosCliente({
  clienteId,
  quadraId,
  quadraNome,
}: {
  clienteId:  string
  quadraId:   string
  quadraNome: string
}) {
  const [date, setDate]             = useState(new Date())
  const [ocupacoes, setOcupacoes]   = useState<Ocupacao[]>([])
  const [slotAberto, setSlotAberto] = useState<string | null>(null)
  const [duracaoSel, setDuracaoSel] = useState<number | null>(null)
  const [sucesso, setSucesso]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const dateStr = format(date, "yyyy-MM-dd")

  useEffect(() => {
    setSlotAberto(null)
    setDuracaoSel(null)
    setSucesso(null)
    buscarOcupacoes(quadraId, dateStr).then(setOcupacoes)
  }, [dateStr, quadraId])

  // Gera slots de 30 em 30 min: 08:00, 08:30 … 22:30
  const slots: string[] = []
  for (let min = HOUR_START * 60; min < HOUR_END * 60; min += 30) {
    slots.push(fmtMin(min))
  }

  function toggleSlot(slot: string) {
    if (slotAberto === slot) {
      setSlotAberto(null)
      setDuracaoSel(null)
    } else {
      setSlotAberto(slot)
      setDuracaoSel(null)
      setSucesso(null)
    }
  }

  function confirmar() {
    if (!slotAberto || !duracaoSel) return
    const fim      = adicionarMin(slotAberto, duracaoSel)
    const conflitos = conflitosNoPeriodo(slotAberto, fim, ocupacoes)
    if (conflitos.length > 0) return

    startTransition(async () => {
      try {
        await criarReserva({
          clienteId,
          quadraId,
          data:       dateStr,
          horaInicio: slotAberto,
          horaFim:    fim,
          observacao: null,
        })
        setSucesso(`Reserva das ${slotAberto} às ${fim} enviada! Aguardando confirmação.`)
        setSlotAberto(null)
        setDuracaoSel(null)
        buscarOcupacoes(quadraId, dateStr).then(setOcupacoes)
      } catch {
        setSucesso(null)
      }
    })
  }

  const labelData = isToday(date)
    ? "Hoje"
    : format(date, "EEE, dd/MM", { locale: ptBR })

  return (
    <div className="space-y-4">

      {/* ── Navegação de data ── */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
        <Button
          variant="ghost" size="icon"
          onClick={() => setDate((d) => subDays(d, 1))}
          disabled={isToday(date)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-foreground capitalize">{labelData}</p>
          <p className="text-xs text-muted-foreground">{format(date, "dd 'de' MMMM", { locale: ptBR })}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDate((d) => addDays(d, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* ── Feedback de sucesso ── */}
      {sucesso && (
        <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {sucesso}
        </div>
      )}

      {/* ── Lista de slots ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{quadraNome}</p>
          <span className="text-xs text-muted-foreground">
            {fmtMin(HOUR_START * 60)} – {fmtMin(HOUR_END * 60)}
          </span>
        </div>

        <div className="divide-y divide-border">
          {slots.map((slot) => {
            const ocupado = slotEstaOcupado(slot, ocupacoes)
            const aberto  = slotAberto === slot

            return (
              <div key={slot} className={aberto ? "bg-primary/5" : ""}>

                {/* Linha principal do slot */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex items-center gap-1.5 w-16 shrink-0">
                    <Clock className={`w-3.5 h-3.5 ${ocupado ? "text-muted-foreground/50" : "text-primary"}`} />
                    <span className={`text-sm font-mono font-bold ${ocupado ? "text-muted-foreground" : "text-foreground"}`}>
                      {slot}
                    </span>
                  </div>

                  <div className="flex-1">
                    {ocupado ? (
                      <Badge variant="outline" className="border-red-500/30 text-red-400/80 text-xs gap-1 py-0">
                        <Lock className="w-3 h-3" />
                        Ocupado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-primary/30 text-primary text-xs py-0">
                        Disponível
                      </Badge>
                    )}
                  </div>

                  {!ocupado && (
                    <Button
                      size="sm"
                      variant={aberto ? "default" : "outline"}
                      className="shrink-0 text-xs h-8 px-3"
                      onClick={() => toggleSlot(slot)}
                    >
                      {aberto ? "Fechar" : "Reservar"}
                    </Button>
                  )}
                </div>

                {/* ── Painel inline de reserva ── */}
                {aberto && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground pt-3 font-medium uppercase tracking-wider">
                      Início: <span className="text-primary font-bold text-sm normal-case">{slot}</span>
                      {" "}— escolha a duração:
                    </p>

                    {/* Pills de duração */}
                    <div className="flex gap-2">
                      {DURACOES.map(({ min, label }) => {
                        const fim      = adicionarMin(slot, min)
                        const passaFim = toMin(fim) > HOUR_END * 60
                        const conflitos = conflitosNoPeriodo(slot, fim, ocupacoes)
                        const invalido  = passaFim || conflitos.length > 0
                        const selecionado = duracaoSel === min

                        return (
                          <button
                            key={min}
                            type="button"
                            onClick={() => setDuracaoSel(min)}
                            className={`flex-1 py-2.5 px-2 rounded-xl border-2 transition-all text-center ${
                              selecionado
                                ? invalido
                                  ? "border-destructive bg-destructive/10 text-destructive"
                                  : "border-primary bg-primary/10 text-primary"
                                : invalido
                                  ? "border-border/40 bg-secondary/20 text-muted-foreground/40 line-through cursor-not-allowed"
                                  : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                            }`}
                          >
                            <span className="text-sm font-semibold block">{label}</span>
                            {!invalido && (
                              <span className="text-[10px] opacity-60 block">até {fim}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Mensagem de erro por duração */}
                    {duracaoSel && (() => {
                      const fim      = adicionarMin(slot, duracaoSel)
                      const conflitos = conflitosNoPeriodo(slot, fim, ocupacoes)
                      const passaFim  = toMin(fim) > HOUR_END * 60

                      if (passaFim) {
                        return (
                          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Esse horário ultrapassa o fechamento às {HOUR_END}:00.
                          </div>
                        )
                      }

                      if (conflitos.length > 0) {
                        return (
                          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              Não disponível — já existe agendamento das{" "}
                              {conflitos.map((c) => `${c.inicio} às ${c.fim}`).join(" e ")}.
                            </span>
                          </div>
                        )
                      }

                      return null
                    })()}

                    {/* Botões de ação */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-border"
                        onClick={() => toggleSlot(slot)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={
                          !duracaoSel ||
                          isPending ||
                          (() => {
                            if (!duracaoSel) return true
                            const fim = adicionarMin(slot, duracaoSel)
                            return conflitosNoPeriodo(slot, fim, ocupacoes).length > 0 ||
                                   toMin(fim) > HOUR_END * 60
                          })()
                        }
                        onClick={confirmar}
                      >
                        {isPending ? "Enviando…" : "Confirmar reserva"}
                      </Button>
                    </div>

                    <p className="text-[10px] text-muted-foreground/60 text-center">
                      A reserva ficará pendente até ser confirmada pelo administrador.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
