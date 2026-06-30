"use client"

import { useState, useEffect } from "react"
import {
  format, addDays, subDays, isToday,
  endOfMonth, addWeeks, isAfter,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, Lock,
  Repeat2, AlertTriangle, CheckCircle2, Pencil, Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  buscarAgendamentosPorData,
  criarAgendamentoAdmin,
  criarAgendamentosMensaisAdmin,
  editarAgendamento,
  excluirAgendamento,
} from "@/app/dashboard/agendamentos/actions"

// ── Constantes ────────────────────────────────────────────────────────────────

const SLOT_H = 72

const DIAS_SEMANA = ["Domingos", "Segundas-feiras", "Terças-feiras", "Quartas-feiras", "Quintas-feiras", "Sextas-feiras", "Sábados"]

// Retorna horários de funcionamento baseado no dia da semana
function getHours(d: Date) {
  const dow = d.getDay() // 0=Dom, 6=Sáb
  return (dow === 0 || dow === 6)
    ? { start: 8,  end: 19 }   // fim de semana: 08h–19h
    : { start: 18, end: 24 }   // seg–sex: 18h–00h
}

function buildSlots(start: number, end: number) {
  return Array.from({ length: (end - start) * 2 }, (_, i) => {
    const totalMin = start * 60 + i * 30
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return { label: `${(h % 24).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`, h, m }
  })
}

function buildSlotsFim(start: number, end: number) {
  return Array.from({ length: (end - start) * 2 + 1 }, (_, i) => {
    const totalMin = start * 60 + i * 30
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`  // "24:00" p/ meia-noite
    const label = `${(h % 24).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}` // "00:00" p/ display
    return { value, label, h, m }
  })
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Agendamento = {
  id:          string
  clienteNome: string
  inicio:      { h: number; m: number }
  duracaoMin:  number
  tipo:        "AVULSO" | "MENSALISTA"
  valor:       number
  status:      "CONFIRMADO" | "PENDENTE" | "CANCELADO" | "PAGO"
}

type FormState = {
  tipo:    "AVULSO" | "MENSALISTA"
  cliente: string
  dataSel: Date
  inicio:  string
  fim:     string
  valor:   string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMin(h: number, m: number)   { return h * 60 + m }
function toTopPx(h: number, m: number, hourStart: number) {
  return ((h - hourStart) * 2 + m / 30) * SLOT_H
}
function toDurPx(min: number)          { return (min / 30) * SLOT_H }
function dateKey(d: Date)              { return format(d, "yyyy-MM-dd") }

function isSlotOccupied(slot: { h: number; m: number }, ags: Agendamento[]) {
  const s = toMin(slot.h, slot.m)
  return ags.filter((a) => a.status !== "CANCELADO").some((a) => {
    const as = toMin(a.inicio.h, a.inicio.m)
    return as < s + 30 && as + a.duracaoMin > s
  })
}

function gerarDatasMensais(data: Date): Date[] {
  const fim = endOfMonth(data)
  const datas: Date[] = []
  let cur = data
  while (!isAfter(cur, fim)) {
    datas.push(new Date(cur))
    cur = addWeeks(cur, 1)
  }
  return datas
}

function conflitosNoPeriodo(inicioStr: string, fimStr: string, ags: Agendamento[], excluirId?: string) {
  const [ih, im] = inicioStr.split(":").map(Number)
  const [fh, fm] = fimStr.split(":").map(Number)
  const start = toMin(ih, im)
  const end   = toMin(fh, fm)
  if (end <= start) return []
  return ags
    .filter((a) => a.status !== "CANCELADO" && a.id !== excluirId)
    .filter((a) => {
      const as = toMin(a.inicio.h, a.inicio.m)
      const ae = as + a.duracaoMin
      return start < ae && end > as
    })
}

function fmt(h: number, m: number) {
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

// ── Cores de status ───────────────────────────────────────────────────────────

const statusColor: Record<string, string> = {
  CONFIRMADO: "bg-primary/15 border-primary/40 text-primary",
  PENDENTE:   "bg-yellow-400/20 border-yellow-500/40 text-yellow-700",
  CANCELADO:  "bg-red-500/15 border-red-500/40 text-red-600",
  PAGO:       "bg-green-500/15 border-green-500/40 text-green-700",
}

// ── Componente ────────────────────────────────────────────────────────────────

type Precos = {
  valor1h?:   number
  valor1h30?: number
  valor2h?:   number
}

function valorParaDuracao(min: number, precos: Precos): string {
  if (min === 60  && precos.valor1h   != null) return String(precos.valor1h)
  if (min === 90  && precos.valor1h30 != null) return String(precos.valor1h30)
  if (min === 120 && precos.valor2h   != null) return String(precos.valor2h)
  return ""
}

export function CalendarioAgendamentos({
  quadraId,
  quadraNome,
  precos = {},
}: {
  quadraId:   string
  quadraNome: string
  precos?:    Precos
}) {
  const [date, setDate]                 = useState(new Date())
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editandoId, setEditandoId]     = useState<string | null>(null)
  const [salvando, setSalvando]         = useState(false)
  const [excluindo, setExcluindo]       = useState<string | null>(null)
  const [erro, setErro]                 = useState("")
  const [sucesso, setSucesso]           = useState("")

  const [form, setForm] = useState<FormState>({
    tipo:    "AVULSO",
    cliente: "",
    dataSel: new Date(),
    inicio:  "18:00",
    fim:     "19:00",
    valor:   "",
  })
  const [calAberto, setCalAberto] = useState(false)

  const key = dateKey(date)

  // Horários dinâmicos por dia da semana
  const { start: HOUR_START, end: HOUR_END } = getHours(date)
  const slots    = buildSlots(HOUR_START, HOUR_END)
  const slotsFim = buildSlotsFim(HOUR_START, HOUR_END)

  useEffect(() => {
    buscarAgendamentosPorData(key)
      .then(setAgendamentos)
      .catch((err) => console.error("[agendamentos] erro ao buscar:", err))
  }, [key])

  const datasMensais = form.tipo === "MENSALISTA" ? gerarDatasMensais(form.dataSel) : []
  const conflitos    = conflitosNoPeriodo(form.inicio, form.fim, agendamentos, editandoId ?? undefined)
  const ocupado      = conflitos.length > 0
  const fimValido    = toMin(...(form.fim.split(":").map(Number) as [number, number])) >
                       toMin(...(form.inicio.split(":").map(Number) as [number, number]))
  const formValido   = !!form.cliente.trim() && !!form.valor && fimValido

  // ── Handlers ──

  function abrirDialog(slot?: { h: number; m: number }) {
    const inicioH  = slot?.h ?? HOUR_START
    const inicioM  = slot?.m ?? 0
    const rawFim   = inicioH * 60 + inicioM + 60
    const fimMin   = Math.min(rawFim, HOUR_END * 60)
    const inicio   = fmt(inicioH % 24, inicioM)
    const fim      = `${Math.floor(fimMin / 60).toString().padStart(2, "0")}:${(fimMin % 60).toString().padStart(2, "0")}`
    const durMin   = fimMin - (inicioH * 60 + inicioM)
    const valorAuto = valorParaDuracao(durMin, precos)
    setForm({ tipo: "AVULSO", cliente: "", dataSel: date, inicio, fim, valor: valorAuto })
    setEditandoId(null)
    setCalAberto(false)
    setErro("")
    setSucesso("")
    setDialogOpen(true)
  }

  function abrirDialogEditar(ag: Agendamento) {
    const fimMin = toMin(ag.inicio.h, ag.inicio.m) + ag.duracaoMin
    const fimH   = Math.floor(fimMin / 60)
    const fimM   = fimMin % 60
    const fimStr = `${fimH.toString().padStart(2, "0")}:${fimM.toString().padStart(2, "0")}`
    setForm({
      tipo:    ag.tipo,
      cliente: ag.clienteNome,
      dataSel: date,
      inicio:  fmt(ag.inicio.h, ag.inicio.m),
      fim:     fimStr,
      valor:   ag.valor > 0 ? String(ag.valor) : "",
    })
    setEditandoId(ag.id)
    setErro("")
    setSucesso("")
    setDialogOpen(true)
  }

  async function handleExcluir(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.confirm("Excluir este agendamento?")) return
    setExcluindo(id)
    try {
      await excluirAgendamento(id)
      const lista = await buscarAgendamentosPorData(key)
      setAgendamentos(lista)
    } catch {
      alert("Erro ao excluir. Tente novamente.")
    } finally {
      setExcluindo(null)
    }
  }

  async function confirmar() {
    if (!quadraId || !formValido) return
    setSalvando(true)
    setErro("")
    setSucesso("")

    try {
      const dataISO    = format(form.dataSel, "yyyy-MM-dd")
      const valor      = parseFloat(form.valor.replace(",", "."))
      const [ih, im]   = form.inicio.split(":").map(Number)
      const [fh, fm]   = form.fim.split(":").map(Number)
      const duracaoMin = toMin(fh, fm) - toMin(ih, im)

      if (editandoId) {
        await editarAgendamento(editandoId, {
          nomeCliente: form.cliente.trim(),
          data:        dataISO,
          horaInicio:  form.inicio,
          duracaoMin,
          valor,
        })
        setSucesso("Agendamento atualizado!")
      } else if (form.tipo === "AVULSO") {
        await criarAgendamentoAdmin({
          quadraId,
          nomeCliente: form.cliente.trim(),
          data:        dataISO,
          horaInicio:  form.inicio,
          duracaoMin,
          tipo:        "AVULSO",
          valor,
        })
        setSucesso("Agendamento criado!")
      } else {
        await criarAgendamentosMensaisAdmin({
          quadraId,
          nomeCliente: form.cliente.trim(),
          dataInicio:  dataISO,
          horaInicio:  form.inicio,
          duracaoMin,
          valor,
        })
        setSucesso(`${datasMensais.length} agendamento${datasMensais.length !== 1 ? "s" : ""} criado${datasMensais.length !== 1 ? "s" : ""}!`)
      }

      const lista = await buscarAgendamentosPorData(key)
      setAgendamentos(lista)
      setTimeout(() => setDialogOpen(false), 900)
    } catch {
      setErro("Erro ao salvar agendamento. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  // ── JSX ──

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">{quadraNome}</p>
        </div>
        <Button onClick={() => abrirDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo agendamento</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* ── Navegação de datas ── */}
      <div className="flex items-center gap-2 px-4 lg:px-6 py-3 border-b border-border shrink-0 overflow-x-auto">
        <Button variant="ghost" size="icon" onClick={() => setDate((d) => subDays(d, 1))} className="shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex gap-1 flex-1 justify-center">
          {Array.from({ length: 7 }, (_, i) => {
            const d      = addDays(subDays(date, 3), i)
            const active = dateKey(d) === dateKey(date)
            const today  = isToday(d)
            return (
              <button
                key={i}
                onClick={() => setDate(d)}
                className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg transition-all shrink-0 ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span className="text-[10px] uppercase font-medium">{format(d, "EEE", { locale: ptBR }).slice(0, 3)}</span>
                <span className={`text-base font-bold leading-tight ${today && !active ? "text-primary" : ""}`}>{format(d, "d")}</span>
              </button>
            )
          })}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDate((d) => addDays(d, 1))} className="shrink-0">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDate(new Date())} className="shrink-0 text-xs border-border">
          <CalendarDays className="w-3.5 h-3.5 mr-1" />
          Hoje
        </Button>
      </div>

      {/* ── Legenda ── */}
      <div className="flex items-center gap-4 px-4 lg:px-6 py-2 border-b border-border shrink-0">
        {[
          { color: "bg-primary/20 border-primary/40",       label: "Confirmado" },
          { color: "bg-yellow-500/20 border-yellow-500/40", label: "Pendente"   },
          { color: "bg-green-500/20 border-green-500/40",   label: "Pago"       },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`w-3 h-3 rounded-sm border ${color}`} />
            {label}
          </div>
        ))}
      </div>

      {/* ── Grid de horários ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-w-[280px]">
          <div className="w-14 shrink-0">
            {slots.filter((s) => s.m === 0).map((s) => (
              <div key={s.label} style={{ height: SLOT_H * 2 }} className="flex items-start pt-2 pr-3 justify-end">
                <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 relative border-l border-border">
            {slots.map((slot) => {
              const occupied = isSlotOccupied(slot, agendamentos)
              return (
                <div
                  key={slot.label}
                  style={{ height: SLOT_H }}
                  onClick={() => !occupied && abrirDialog(slot)}
                  className={`border-b transition-colors relative ${slot.m === 0 ? "border-border" : "border-border/30"} ${
                    occupied ? "bg-muted/50 cursor-not-allowed" : "cursor-pointer hover:bg-primary/5"
                  }`}
                >
                  {occupied && <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40" />}
                </div>
              )
            })}

            {agendamentos.map((ag) => {
              const top    = toTopPx(ag.inicio.h, ag.inicio.m, HOUR_START)
              const height = toDurPx(ag.duracaoMin)
              // Não renderiza se estiver fora do intervalo visível
              if (top < 0 || top >= slots.length * SLOT_H) return null
              const endMin = toMin(ag.inicio.h, ag.inicio.m) + ag.duracaoMin
              const iniStr = fmt(ag.inicio.h, ag.inicio.m)
              const fimH   = Math.floor(endMin / 60)
              const fimM   = endMin % 60
              const fimStr = fmt(fimH % 24, fimM)
              const isTiny  = height < 55
              const isSmall = height < 90
              const isExcluindo = excluindo === ag.id

              const BtnEditar = (
                <button
                  title="Editar"
                  disabled={isExcluindo}
                  onClick={(e) => { e.stopPropagation(); abrirDialogEditar(ag) }}
                  className="p-1 rounded hover:bg-black/20 transition-colors disabled:opacity-40"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )
              const BtnExcluir = (
                <button
                  title="Excluir"
                  disabled={isExcluindo}
                  onClick={(e) => handleExcluir(ag.id, e)}
                  className="p-1 rounded hover:bg-black/20 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )

              return (
                <div
                  key={ag.id}
                  style={{ top, height, left: 4, right: 4 }}
                  className={`absolute rounded-lg border overflow-hidden select-none ${statusColor[ag.status] ?? statusColor.CONFIRMADO} ${isExcluindo ? "opacity-50" : ""}`}
                >
                  {isTiny ? (
                    <div className="h-full px-2 flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-xs">{iniStr}→{fimStr}</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {BtnEditar}
                        {BtnExcluir}
                      </div>
                    </div>
                  ) : isSmall ? (
                    <div className="h-full px-2 py-1 flex flex-col justify-center gap-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-bold text-sm">{iniStr}→{fimStr}</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {BtnEditar}
                          {BtnExcluir}
                        </div>
                      </div>
                      <p className="text-xs opacity-80 truncate">{ag.clienteNome}</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-black/8 px-3 py-1.5 flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-base leading-none tracking-wide">
                          {iniStr}<span className="opacity-50 mx-1.5 font-normal">→</span>{fimStr}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {BtnEditar}
                          {BtnExcluir}
                        </div>
                      </div>
                      <div className="px-3 py-2 flex flex-col gap-1">
                        <p className="text-sm font-semibold leading-tight truncate">{ag.clienteNome}</p>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-black/20 border-0 text-inherit">
                            {ag.tipo === "MENSALISTA" ? "Mensalista" : "Avulso"}
                          </Badge>
                          {ag.valor > 0 && <span className="text-xs opacity-70">R$ {ag.valor}</span>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Dialog: Novo / Editar Agendamento ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!salvando) { setDialogOpen(open); if (!open) setEditandoId(null) } }}>
        <DialogContent className="bg-card border-border w-full max-w-md mx-auto max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg">
              {editandoId ? "Editar Agendamento" : "Novo Agendamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1 pb-2">

            {/* ── Tipo (desabilitado ao editar) ── */}
            {!editandoId && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</Label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: "AVULSO",     label: "Avulso",     desc: "Dia único",  Icon: CalendarDays },
                    { value: "MENSALISTA", label: "Mensalista", desc: "Todo o mês", Icon: Repeat2      },
                  ] as const).map(({ value, label, desc, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tipo: value }))}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        form.tipo === value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${form.tipo === value ? "text-primary" : ""}`} />
                      <div className="text-center">
                        <p className="font-semibold text-sm leading-tight">{label}</p>
                        <p className="text-xs opacity-60 mt-0.5">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Nome do cliente ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nome do Cliente
              </Label>
              <Input
                placeholder="Ex: João Silva"
                value={form.cliente}
                onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11"
              />
            </div>

            {/* ── Data ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</Label>
              <Popover open={calAberto} onOpenChange={setCalAberto}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full h-11 flex items-center gap-2 px-3 rounded-md border border-border bg-secondary text-foreground text-sm font-normal hover:bg-secondary/80 transition-colors"
                  >
                    <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                    {format(form.dataSel, "dd/MM/yyyy")}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-2">
                  <Calendar
                    mode="single"
                    selected={form.dataSel}
                    onSelect={(d) => {
                      if (d) {
                        setForm((f) => ({ ...f, dataSel: d }))
                        setDate(d)
                        setCalAberto(false)
                      }
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* ── Início + Término ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Início</Label>
                <Select
                  value={form.inicio}
                  onValueChange={(v) => {
                    const [ih, im] = v.split(":").map(Number)
                    const rawFim   = ih * 60 + im + 60
                    const fimMin   = Math.min(rawFim, HOUR_END * 60)
                    const novoFim  = `${Math.floor(fimMin / 60).toString().padStart(2, "0")}:${(fimMin % 60).toString().padStart(2, "0")}`
                    const [fh, fm] = form.fim.split(":").map(Number)
                    const fimAtualValido = toMin(fh, fm) > toMin(ih, im)
                    const fimEfetivo = fimAtualValido ? form.fim : novoFim
                    const [efh, efm] = fimEfetivo.split(":").map(Number)
                    const durMin = toMin(efh, efm) - toMin(ih, im)
                    const valorAuto = valorParaDuracao(durMin, precos)
                    setForm((f) => ({
                      ...f,
                      inicio: v,
                      fim:    fimEfetivo,
                      valor:  valorAuto !== "" ? valorAuto : f.valor,
                    }))
                  }}
                >
                  <SelectTrigger className="bg-secondary border-border text-foreground h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-56">
                    {slots.map((s) => (
                      <SelectItem key={s.label} value={s.label} className="text-foreground">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Término</Label>
                <Select
                  value={form.fim}
                  onValueChange={(v) => {
                    const [ih, im] = form.inicio.split(":").map(Number)
                    const [fh, fm] = v.split(":").map(Number)
                    const durMin   = toMin(fh, fm) - toMin(ih, im)
                    const valorAuto = valorParaDuracao(durMin, precos)
                    setForm((f) => ({
                      ...f,
                      fim:   v,
                      valor: valorAuto !== "" ? valorAuto : f.valor,
                    }))
                  }}
                >
                  <SelectTrigger className="bg-secondary border-border text-foreground h-11">
                    <SelectValue>
                      {/* Exibe "00:00" quando valor interno é "24:00" */}
                      {form.fim === "24:00" ? "00:00" : form.fim}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-56">
                    {slotsFim
                      .filter((s) => {
                        const [ih, im] = form.inicio.split(":").map(Number)
                        return toMin(s.h, s.m) > toMin(ih, im)
                      })
                      .map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-foreground">
                          {s.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Preview mensalista ── */}
            {form.tipo === "MENSALISTA" && !editandoId && datasMensais.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Repeat2 className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-sm font-semibold text-foreground">
                    {datasMensais.length} agendamento{datasMensais.length !== 1 ? "s" : ""} serão criados
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {DIAS_SEMANA[datasMensais[0].getDay()]} · até {format(endOfMonth(datasMensais[0]), "dd/MM/yyyy")}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {datasMensais.map((d, i) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">
                      {format(d, "dd/MM")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Aviso de conflito ── */}
            {ocupado && (
              <div className="flex gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Conflito de horário</p>
                  <ul className="space-y-0.5">
                    {conflitos.map((c) => {
                      const fimMin = toMin(c.inicio.h, c.inicio.m) + c.duracaoMin
                      return (
                        <li key={c.id} className="text-xs font-medium">
                          • {c.clienteNome} — {fmt(c.inicio.h, c.inicio.m)} às {fmt(Math.floor(fimMin / 60) % 24, fimMin % 60)}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            )}

            {/* ── Valor ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Valor por sessão (R$)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                <Input
                  type="number"
                  step="0.50"
                  min="0"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11 pl-9"
                />
              </div>
            </div>

            {/* ── Feedback ── */}
            {erro && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {erro}
              </div>
            )}
            {sucesso && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {sucesso}
              </div>
            )}

            {/* ── Botões ── */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-11 border-border"
                onClick={() => { setDialogOpen(false); setEditandoId(null) }}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-11 font-semibold"
                onClick={confirmar}
                disabled={!formValido || salvando || ocupado}
              >
                {salvando ? "Salvando..." : editandoId ? "Salvar" : "Confirmar"}
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
