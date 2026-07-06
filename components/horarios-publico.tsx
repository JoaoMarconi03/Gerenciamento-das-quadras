"use client"

import { useState, useEffect } from "react"
import { format, addDays, subDays, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ChevronLeft, ChevronRight, Clock, Lock,
  AlertTriangle, MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { buscarOcupacoesPublico } from "@/app/actions"

const DURACOES = [
  { min: 60,  label: "1 hora"  },
  { min: 90,  label: "1h 30"   },
  { min: 120, label: "2 horas" },
]

type Ocupacao = { inicio: string; fim: string }

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

export function HorariosPublico({
  quadraId,
  quadraNome,
  valor1h,
  valor1h30,
  valor2h,
  horaAbertura = "08:00",
  horaFechamento = "23:00",
  whatsapp = "",
}: {
  quadraId:       string
  quadraNome:     string
  valor1h:        number | null
  valor1h30:      number | null
  valor2h:        number | null
  horaAbertura?:  string
  horaFechamento?: string
  whatsapp?:      string
}) {
  const [date, setDate]             = useState(new Date())
  const [ocupacoes, setOcupacoes]   = useState<Ocupacao[]>([])
  const [slotAberto, setSlotAberto] = useState<string | null>(null)
  const [duracaoSel, setDuracaoSel] = useState<number | null>(null)

  const dateStr = format(date, "yyyy-MM-dd")

  // Converte "HH:MM" → minutos; "00:00" vira meia-noite (24h = 1440 min)
  const INICIO_MIN = toMin(horaAbertura)
  const FIM_MIN    = horaFechamento === "00:00" ? 24 * 60 : toMin(horaFechamento)

  useEffect(() => {
    setSlotAberto(null)
    setDuracaoSel(null)
    if (!quadraId) return
    buscarOcupacoesPublico(quadraId, dateStr).then(setOcupacoes)
  }, [dateStr, quadraId])

  useEffect(() => {
    if (!quadraId) return
    const id = setInterval(() => {
      buscarOcupacoesPublico(quadraId, dateStr).then(setOcupacoes)
    }, 10_000)
    return () => clearInterval(id)
  }, [quadraId, dateStr])

  // Slots de 30 em 30 minutos dentro do horário configurado
  const slots: string[] = []
  for (let min = INICIO_MIN; min < FIM_MIN; min += 30) {
    slots.push(fmtMin(min))
  }

  const labelFim = FIM_MIN === 24 * 60 ? "00:00" : fmtMin(FIM_MIN)

  function getValor(min: number): number | null {
    if (min === 60)  return valor1h
    if (min === 90)  return valor1h30
    return valor2h
  }

  function toggleSlot(slot: string) {
    if (slotAberto === slot) {
      setSlotAberto(null)
      setDuracaoSel(null)
    } else {
      setSlotAberto(slot)
      setDuracaoSel(null)
    }
  }

  function irParaWhatsApp() {
    if (!slotAberto || !duracaoSel) return
    const fim      = adicionarMin(slotAberto, duracaoSel)
    if (conflitosNoPeriodo(slotAberto, fim, ocupacoes).length > 0) return

    const dataFormatada = format(date, "dd/MM/yyyy")
    const durLabel      = DURACOES.find((d) => d.min === duracaoSel)?.label ?? ""
    const mensagem =
      `Olá! Gostaria de reservar ${quadraNome} para o dia ${dataFormatada} das ${slotAberto} às ${fim} (${durLabel}). Poderia confirmar o horário?`

    const numero = whatsapp || "5515997740451"
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, "_blank")
  }

  const labelData = isToday(date)
    ? "Hoje"
    : format(date, "EEE, dd/MM", { locale: ptBR })

  return (
    <div className="space-y-4">

      {/* Navegação de data */}
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

      {/* Lista de slots */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{quadraNome}</p>
          <span className="text-xs text-muted-foreground">
            {fmtMin(INICIO_MIN)} – {labelFim}
          </span>
        </div>

        <div className="divide-y divide-border">
          {slots.map((slot) => {
            const ocupado = slotEstaOcupado(slot, ocupacoes)
            const aberto  = slotAberto === slot

            return (
              <div key={slot} className={aberto ? "bg-primary/5" : ""}>

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

                {/* Painel inline de reserva */}
                {aberto && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground pt-3 font-medium uppercase tracking-wider">
                      Início: <span className="text-primary font-bold text-sm normal-case">{slot}</span>
                      {" "}— escolha a duração:
                    </p>

                    <div className="flex gap-2">
                      {DURACOES.map(({ min, label }) => {
                        const fim      = adicionarMin(slot, min)
                        const passaFim  = toMin(fim) > FIM_MIN
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

                    {duracaoSel && (() => {
                      const fim      = adicionarMin(slot, duracaoSel)
                      const conflitos = conflitosNoPeriodo(slot, fim, ocupacoes)
                      const passaFim  = toMin(fim) > FIM_MIN

                      if (passaFim) {
                        return (
                          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Esse horário ultrapassa o fechamento.
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

                    {duracaoSel && (() => {
                      const fim = adicionarMin(slot, duracaoSel)
                      const invalido =
                        toMin(fim) > FIM_MIN ||
                        conflitosNoPeriodo(slot, fim, ocupacoes).length > 0
                      const valor = getValor(duracaoSel)
                      if (invalido || !valor) return null
                      return (
                        <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
                          <p className="text-xs text-muted-foreground">Valor da reserva</p>
                          <p className="text-base font-bold text-foreground">
                            R$ {valor.toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                      )
                    })()}

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
                        className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                        disabled={
                          !duracaoSel ||
                          (() => {
                            if (!duracaoSel) return true
                            const fim = adicionarMin(slot, duracaoSel)
                            return conflitosNoPeriodo(slot, fim, ocupacoes).length > 0 ||
                                   toMin(fim) > FIM_MIN
                          })()
                        }
                        onClick={irParaWhatsApp}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Falar no WhatsApp
                      </Button>
                    </div>
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
