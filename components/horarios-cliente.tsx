"use client"

import { useState, useTransition } from "react"
import { Lock, CheckCircle2, Clock, XCircle, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { criarReserva } from "@/app/minha-conta/horarios/actions"

const BLOCOS_OCUPADOS = [
  { inicio: "10:00", duracaoMin: 60 },
  { inicio: "14:00", duracaoMin: 120 },
  { inicio: "19:00", duracaoMin: 90 },
]

const DURACOES = [
  { label: "1 hora",  min: 60  },
  { label: "1h30",    min: 90  },
  { label: "2 horas", min: 120 },
  { label: "2h30",    min: 150 },
  { label: "3 horas", min: 180 },
]

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function toMin(hora: string) {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

function toStr(min: number) {
  return `${Math.floor(min / 60).toString().padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`
}

function formatDuracao(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (m === 0) return `${h}h livres`
  return `${h}h${m.toString().padStart(2, "0")} livres`
}

function formatData(date: Date) {
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
}

type BlocoLivre   = { tipo: "livre";   inicio: string; fim: string; duracaoMin: number }
type BlocoOcupado = { tipo: "ocupado"; inicio: string; fim: string }
type Bloco = BlocoLivre | BlocoOcupado

function buildTimeline(): Bloco[] {
  const blocos: Bloco[] = []
  let current = 8 * 60
  const end = 23 * 60

  const sorted = [...BLOCOS_OCUPADOS].sort((a, b) => toMin(a.inicio) - toMin(b.inicio))

  for (const ocupado of sorted) {
    const bStart = toMin(ocupado.inicio)
    const bEnd = bStart + ocupado.duracaoMin
    if (current < bStart) {
      blocos.push({ tipo: "livre", inicio: toStr(current), fim: toStr(bStart), duracaoMin: bStart - current })
    }
    blocos.push({ tipo: "ocupado", inicio: toStr(bStart), fim: toStr(bEnd) })
    current = bEnd
  }

  if (current < end) {
    blocos.push({ tipo: "livre", inicio: toStr(current), fim: toStr(end), duracaoMin: end - current })
  }

  return blocos
}

type Props = {
  nomeCliente: string
  clienteId: string
  quadraId: string
  quadraNome: string
}

export function HorariosCliente({ nomeCliente, clienteId, quadraId, quadraNome }: Props) {
  const [duracaoMin, setDuracaoMin] = useState(60)
  const [modalOpen, setModalOpen] = useState(false)
  const [horarioSelecionado, setHorarioSelecionado] = useState<{ inicio: string; fim: string } | null>(null)
  const [observacao, setObservacao] = useState("")
  const [confirmado, setConfirmado] = useState(false)
  const [erro, setErro] = useState("")
  const [isPending, startTransition] = useTransition()

  // Navegação de dias
  const hoje = new Date()
  const [offset, setOffset] = useState(0)
  const dataAtual = new Date(hoje)
  dataAtual.setDate(hoje.getDate() + offset)

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() + i)
    return d
  })

  const timeline = buildTimeline()

  function abrirModal(inicio: string) {
    const inicioMin = toMin(inicio)
    const fimMin = inicioMin + duracaoMin
    setHorarioSelecionado({ inicio, fim: toStr(fimMin) })
    setObservacao("")
    setConfirmado(false)
    setModalOpen(true)
  }

  function confirmarReserva() {
    if (!horarioSelecionado) return
    setErro("")

    // Monta os DateTimes combinando dataAtual + horário selecionado
    const [hIni, mIni] = horarioSelecionado.inicio.split(":").map(Number)
    const [hFim, mFim] = horarioSelecionado.fim.split(":").map(Number)

    const inicio = new Date(dataAtual)
    inicio.setHours(hIni, mIni, 0, 0)

    const fim = new Date(dataAtual)
    fim.setHours(hFim, mFim, 0, 0)

    startTransition(async () => {
      try {
        await criarReserva({
          clienteId,
          quadraId,
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          observacao: observacao.trim() || null,
        })
        setConfirmado(true)
      } catch {
        setErro("Erro ao salvar reserva. Tente novamente.")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Seletor de duração */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Qual duração você deseja?
        </p>
        <div className="flex flex-wrap gap-2">
          {DURACOES.map((d) => (
            <button
              key={d.min}
              onClick={() => setDuracaoMin(d.min)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                duracaoMin === d.min
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-secondary text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Mostrando disponibilidade para{" "}
          <span className="text-primary font-semibold">
            {DURACOES.find((d) => d.min === duracaoMin)?.label}
          </span>
        </p>
      </div>

      {/* Navegação de dias */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
            disabled={offset === 0}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-2 flex-1 overflow-x-auto pb-1">
            {dias.map((d, i) => {
              const isAtivo = d.toDateString() === dataAtual.toDateString()
              return (
                <button
                  key={i}
                  onClick={() => setOffset(i)}
                  className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    isAtivo
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border text-muted-foreground bg-card hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span className="text-[10px] uppercase font-semibold opacity-70">
                    {i === 0 ? "Hoje" : DIAS_SEMANA[d.getDay()]}
                  </span>
                  <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setOffset((o) => Math.min(6, o + 1))}
            disabled={offset === 6}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground capitalize">{formatData(dataAtual)}</p>
      </div>

      {/* Timeline */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="font-semibold text-sm">{quadraNome}</p>
          <span className="text-xs text-muted-foreground">08:00 – 23:00</span>
        </div>

        <div className="divide-y divide-border">
          {timeline.map((bloco) => {
            if (bloco.tipo === "ocupado") {
              return (
                <div key={bloco.inicio} className="flex items-center gap-4 px-5 py-4 bg-destructive/5">
                  <div className="w-1 h-9 rounded-full shrink-0 bg-destructive/60" />
                  <div className="flex items-center gap-1.5 font-mono font-bold text-base min-w-[150px]">
                    <span>{bloco.inicio}</span>
                    <span className="text-muted-foreground font-normal text-sm">→</span>
                    <span>{bloco.fim}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <Lock className="w-3.5 h-3.5 text-destructive/70" />
                    <span className="text-sm font-semibold text-destructive/80">Ocupado</span>
                  </div>
                </div>
              )
            }

            const cabe = bloco.duracaoMin >= duracaoMin

            return (
              <div
                key={bloco.inicio}
                className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                  cabe ? "hover:bg-primary/5" : "opacity-40"
                }`}
              >
                <div className={`w-1 h-9 rounded-full shrink-0 ${cabe ? "bg-primary/70" : "bg-muted-foreground/30"}`} />
                <div className="flex flex-col min-w-[150px]">
                  <div className="flex items-center gap-1.5 font-mono font-bold text-base">
                    <span>{bloco.inicio}</span>
                    <span className="text-muted-foreground font-normal text-sm">→</span>
                    <span>{bloco.fim}</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5">{formatDuracao(bloco.duracaoMin)}</span>
                </div>
                <div className="flex-1">
                  {cabe ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">Disponível</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-muted-foreground/50" />
                      <span className="text-sm text-muted-foreground">Janela pequena demais</span>
                    </div>
                  )}
                </div>
                {cabe && (
                  <Button size="sm" className="shrink-0" onClick={() => abrirModal(bloco.inicio)}>
                    Reservar
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de reserva */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {confirmado ? "Reserva enviada!" : "Confirmar reserva"}
            </DialogTitle>
          </DialogHeader>

          {confirmado ? (
            <div className="flex flex-col items-center py-6 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">Pedido de reserva enviado!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Aguarde a confirmação do administrador. Você será notificado em breve.
                </p>
              </div>
              <div className="bg-secondary rounded-xl px-5 py-3 text-sm w-full text-left space-y-1">
                <p><span className="text-muted-foreground">Data:</span> <span className="font-medium capitalize">{formatData(dataAtual)}</span></p>
                <p><span className="text-muted-foreground">Horário:</span> <span className="font-medium font-mono">{horarioSelecionado?.inicio} → {horarioSelecionado?.fim}</span></p>
                <p><span className="text-muted-foreground">Duração:</span> <span className="font-medium">{DURACOES.find(d => d.min === duracaoMin)?.label}</span></p>
              </div>
              <Button className="w-full" onClick={() => setModalOpen(false)}>Fechar</Button>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {/* Resumo do agendamento */}
              <div className="bg-secondary rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium capitalize">{formatData(dataAtual)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">Horário:</span>
                  <span className="font-mono font-bold">
                    {horarioSelecionado?.inicio} → {horarioSelecionado?.fim}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-4 h-4 shrink-0" />
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="font-medium">{DURACOES.find(d => d.min === duracaoMin)?.label}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-4 h-4 shrink-0" />
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{nomeCliente}</span>
                </div>
              </div>

              {/* Observação */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Observação (opcional)</Label>
                <Input
                  placeholder="Ex: vou levar bola, somos 10 pessoas..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {erro && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20">
                  {erro}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Ao confirmar, sua reserva ficará com status <span className="text-yellow-400 font-medium">Pendente</span> até ser aprovada pelo administrador.
              </p>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 border-border" disabled={isPending} onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" disabled={isPending} onClick={confirmarReserva}>
                  {isPending ? "Salvando..." : "Confirmar reserva"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
