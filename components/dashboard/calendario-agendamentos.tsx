"use client"

import { useState, useEffect } from "react"
import {
  format, addDays, subDays, isToday,
  endOfMonth, addWeeks, isAfter,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, Lock,
  Repeat2, AlertTriangle, CheckCircle2,
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
} from "@/app/dashboard/agendamentos/actions"

// ── Constantes ────────────────────────────────────────────────────────────────

const SLOT_H     = 72
const HOUR_START = 8
const HOUR_END   = 23

const slots = Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, i) => {
  const totalMin = HOUR_START * 60 + i * 30
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return { label: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`, h, m }
})

const DIAS_SEMANA = ["Domingos", "Segundas-feiras", "Terças-feiras", "Quartas-feiras", "Quintas-feiras", "Sextas-feiras", "Sábados"]

// Slots de FIM incluem 23:00 (um a mais que os de início)
const slotsFim = Array.from({ length: (HOUR_END - HOUR_START) * 2 + 1 }, (_, i) => {
  const totalMin = HOUR_START * 60 + i * 30
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return { label: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`, h, m }
})

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Agendamento = {
  id:          string
  clienteNome: string
  inicio:      { h: number; m: number }
  duracaoMin:  number
  tipo:        "AVULSO" | "MENSALISTA"
  valor:       number
  status:      "CONFIRMADO" | "PENDENTE" | "CANCELADO"
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

function toMin(h: number, m: number)    { return h * 60 + m }
function toTopPx(h: number, m: number)  { return ((h - HOUR_START) * 2 + m / 30) * SLOT_H }
function toDurPx(min: number)           { return (min / 30) * SLOT_H }
function dateKey(d: Date)               { return format(d, "yyyy-MM-dd") }

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

function conflitosNoPeriodo(inicioStr: string, fimStr: string, ags: Agendamento[]) {
  const [ih, im] = inicioStr.split(":").map(Number)
  const [fh, fm] = fimStr.split(":").map(Number)
  const start = toMin(ih, im)
  const end   = toMin(fh, fm)
  if (end <= start) return []
  return ags.filter((a) => a.status !== "CANCELADO").filter((a) => {
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
  CONFIRMADO: "bg-primary/20 border-primary/40 text-primary",
  PENDENTE:   "bg-yellow-500/20 border-yellow-500/40 text-yellow-400",
  CANCELADO:  "bg-red-500/20 border-red-500/40 text-red-400",
}

// ── Componente ────────────────────────────────────────────────────────────────

export function CalendarioAgendamentos({
  quadraId,
  quadraNome,
}: {
  quadraId:  string
  quadraNome: string
}) {
  const [date, setDate]               = useState(new Date())
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [salvando, setSalvando]       = useState(false)
  const [erro, setErro]               = useState("")
  const [sucesso, setSucesso]         = useState("")

  const [form, setForm] = useState<FormState>({
    tipo:    "AVULSO",
    cliente: "",
    dataSel: new Date(),
    inicio:  "08:00",
    fim:     "09:00",
    valor:   "",
  })
  const [calAberto, setCalAberto] = useState(false)

  const key = dateKey(date)

  useEffect(() => {
    buscarAgendamentosPorData(key)
      .then(setAgendamentos)
      .catch((err) => console.error("[agendamentos] erro ao buscar:", err))
  }, [key])

  const datasMensais = form.tipo === "MENSALISTA" ? gerarDatasMensais(form.dataSel) : []
  const conflitos    = conflitosNoPeriodo(form.inicio, form.fim, agendamentos)
  const ocupado      = conflitos.length > 0
  const fimValido    = toMin(...(form.fim.split(":").map(Number) as [number, number])) >
                       toMin(...(form.inicio.split(":").map(Number) as [number, number]))
  const formValido   = !!form.cliente.trim() && !!form.valor && fimValido

  // ── Handlers ──

  function abrirDialog(slot?: { h: number; m: number }) {
    const inicioH = slot?.h ?? 8
    const inicioM = slot?.m ?? 0
    const fimMin  = inicioH * 60 + inicioM + 60
    const inicio  = `${inicioH.toString().padStart(2, "0")}:${inicioM.toString().padStart(2, "0")}`
    const fim     = `${Math.floor(fimMin / 60).toString().padStart(2, "0")}:${(fimMin % 60).toString().padStart(2, "0")}`
    setForm({
      tipo:    "AVULSO",
      cliente: "",
      dataSel: date,
      inicio,
      fim,
      valor:   "",
    })
    setCalAberto(false)
    setErro("")
    setSucesso("")
    setDialogOpen(true)
  }

  async function confirmar() {
    if (!quadraId || !formValido) return
    setSalvando(true)
    setErro("")
    setSucesso("")

    try {
      const dataISO  = format(form.dataSel, "yyyy-MM-dd")
      const valor    = parseFloat(form.valor.replace(",", "."))
      const [ih, im] = form.inicio.split(":").map(Number)
      const [fh, fm] = form.fim.split(":").map(Number)
      const duracaoMin = toMin(fh, fm) - toMin(ih, im)

      if (form.tipo === "AVULSO") {
        await criarAgendamentoAdmin({
          quadraId,
          nomeCliente: form.cliente.trim(),
          data:        dataISO,
          horaInicio:  form.inicio,
          duracaoMin,
          tipo:        "AVULSO",
          valor,
        })
        setSucesso("Agendamento criado com sucesso!")
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
      setErro("Erro ao criar agendamento. Tente novamente.")
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
              const top     = toTopPx(ag.inicio.h, ag.inicio.m)
              const height  = toDurPx(ag.duracaoMin)
              const endMin  = toMin(ag.inicio.h, ag.inicio.m) + ag.duracaoMin
              const iniStr  = `${ag.inicio.h.toString().padStart(2, "0")}:${ag.inicio.m.toString().padStart(2, "0")}`
              const fimStr  = `${Math.floor(endMin / 60).toString().padStart(2, "0")}:${(endMin % 60).toString().padStart(2, "0")}`
              const isTiny  = height < 55
              const isSmall = height < 90

              return (
                <div
                  key={ag.id}
                  style={{ top, height, left: 4, right: 4 }}
                  className={`absolute rounded-lg border overflow-hidden select-none ${statusColor[ag.status]}`}
                >
                  {isTiny ? (
                    <div className="h-full px-3 flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm">{iniStr} → {fimStr}</span>
                      <span className="text-[10px] font-semibold opacity-70 uppercase tracking-wide shrink-0">Ocupado</span>
                    </div>
                  ) : isSmall ? (
                    <div className="h-full px-3 py-1.5 flex flex-col justify-center gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-sm">{iniStr} → {fimStr}</span>
                        <span className="text-[10px] font-bold opacity-70 uppercase tracking-wide shrink-0">Ocupado</span>
                      </div>
                      <p className="text-xs opacity-80 truncate">{ag.clienteNome}</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-black/20 px-3 py-1.5 flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-base leading-none tracking-wide">
                          {iniStr}<span className="opacity-50 mx-1.5 font-normal">→</span>{fimStr}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-widest opacity-80">Ocupado</span>
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

      {/* ── Dialog: Novo Agendamento ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!salvando) setDialogOpen(open) }}>
        <DialogContent className="bg-card border-border w-full max-w-md mx-auto max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg">Novo Agendamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1 pb-2">

            {/* ── Tipo ── */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "AVULSO",     label: "Avulso",      desc: "Dia único",   Icon: CalendarDays },
                  { value: "MENSALISTA", label: "Mensalista",  desc: "Todo o mês",  Icon: Repeat2      },
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
                    const fimMin   = ih * 60 + im + 60
                    const novoFim  = `${Math.floor(fimMin / 60).toString().padStart(2, "0")}:${(fimMin % 60).toString().padStart(2, "0")}`
                    const [fh, fm] = form.fim.split(":").map(Number)
                    const fimAtualValido = toMin(fh, fm) > toMin(ih, im)
                    setForm((f) => ({ ...f, inicio: v, fim: fimAtualValido ? f.fim : novoFim }))
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
                  onValueChange={(v) => setForm((f) => ({ ...f, fim: v }))}
                >
                  <SelectTrigger className="bg-secondary border-border text-foreground h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-56">
                    {slotsFim
                      .filter((s) => {
                        const [ih, im] = form.inicio.split(":").map(Number)
                        return toMin(s.h, s.m) > toMin(ih, im)
                      })
                      .map((s) => (
                        <SelectItem key={s.label} value={s.label} className="text-foreground">
                          {s.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Preview mensalista ── */}
            {form.tipo === "MENSALISTA" && datasMensais.length > 0 && (
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
                  <p className="text-xs opacity-80">
                    {conflitos.length === 1 ? "Já existe um agendamento" : "Já existem agendamentos"} neste período:
                  </p>
                  <ul className="space-y-0.5">
                    {conflitos.map((c) => {
                      const fimMin = toMin(c.inicio.h, c.inicio.m) + c.duracaoMin
                      const fimH   = Math.floor(fimMin / 60)
                      const fimM   = fimMin % 60
                      return (
                        <li key={c.id} className="text-xs font-medium">
                          • {c.clienteNome} — {fmt(c.inicio.h, c.inicio.m)} às {fmt(fimH, fimM)}
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
                onClick={() => setDialogOpen(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-11 font-semibold"
                onClick={confirmar}
                disabled={!formValido || salvando || ocupado}
              >
                {salvando ? "Salvando..." : "Confirmar"}
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
