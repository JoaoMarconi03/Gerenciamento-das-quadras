"use client"

import { useState } from "react"
import { format, addDays, subDays, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const SLOT_H = 72
const HOUR_START = 8
const HOUR_END = 23

const slots = Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, i) => {
  const totalMin = HOUR_START * 60 + i * 30
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return { label: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`, h, m }
})

type Agendamento = {
  id: string
  clienteNome: string
  inicio: { h: number; m: number }
  duracaoMin: number
  tipo: "AVULSO" | "MENSALISTA"
  valor: number
  status: "CONFIRMADO" | "PENDENTE" | "CANCELADO"
}

const mockData: Record<string, Agendamento[]> = {
  "2025-06-23": [
    { id: "1", clienteNome: "João Silva",   inicio: { h: 8,  m: 0 }, duracaoMin: 90,  tipo: "MENSALISTA", valor: 0,   status: "CONFIRMADO" },
    { id: "2", clienteNome: "Pedro Santos", inicio: { h: 10, m: 0 }, duracaoMin: 60,  tipo: "AVULSO",     valor: 60,  status: "CONFIRMADO" },
    { id: "3", clienteNome: "Carlos Lima",  inicio: { h: 14, m: 0 }, duracaoMin: 60,  tipo: "AVULSO",     valor: 60,  status: "PENDENTE"   },
    { id: "4", clienteNome: "Grupo Digão",  inicio: { h: 19, m: 0 }, duracaoMin: 90,  tipo: "MENSALISTA", valor: 0,   status: "CONFIRMADO" },
  ],
  "2025-06-24": [
    { id: "5", clienteNome: "Ana Oliveira",  inicio: { h: 9,  m: 0 }, duracaoMin: 60,  tipo: "AVULSO", valor: 60,  status: "CONFIRMADO" },
    { id: "6", clienteNome: "Marcos Torres", inicio: { h: 20, m: 0 }, duracaoMin: 120, tipo: "AVULSO", valor: 120, status: "PENDENTE"   },
  ],
}

function toMin(h: number, m: number) { return h * 60 + m }
function toTopPx(h: number, m: number) { return ((h - HOUR_START) * 2 + m / 30) * SLOT_H }
function toDurationPx(min: number) { return (min / 30) * SLOT_H }
function dateKey(d: Date) { return format(d, "yyyy-MM-dd") }

function isSlotOccupied(slot: { h: number; m: number }, ags: Agendamento[]) {
  const slotStart = toMin(slot.h, slot.m)
  const slotEnd = slotStart + 30
  return ags.filter((a) => a.status !== "CANCELADO").some((a) => {
    const agStart = toMin(a.inicio.h, a.inicio.m)
    const agEnd = agStart + a.duracaoMin
    return agStart < slotEnd && agEnd > slotStart
  })
}

function getAvailableSlots(duracaoMin: number, ags: Agendamento[]) {
  return slots.filter((slot) => {
    const newStart = toMin(slot.h, slot.m)
    const newEnd = newStart + duracaoMin
    if (newEnd > HOUR_END * 60) return false
    return !ags.filter((a) => a.status !== "CANCELADO").some((a) => {
      const agStart = toMin(a.inicio.h, a.inicio.m)
      const agEnd = agStart + a.duracaoMin
      return newStart < agEnd && newEnd > agStart
    })
  })
}

const statusColor: Record<string, string> = {
  CONFIRMADO: "bg-primary/20 border-primary/40 text-primary",
  PENDENTE:   "bg-yellow-500/20 border-yellow-500/40 text-yellow-400",
  CANCELADO:  "bg-red-500/20 border-red-500/40 text-red-400",
}

export function CalendarioAgendamentos() {
  const [date, setDate] = useState(new Date(2025, 5, 23))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ inicio: "08:00", cliente: "", duracao: "60", tipo: "AVULSO", valor: "60", observacao: "" })

  const key = dateKey(date)
  const agendamentos = mockData[key] ?? []
  const availableSlots = getAvailableSlots(parseInt(form.duracao), agendamentos)
  const inicioValido = availableSlots.some((s) => s.label === form.inicio)

  function openDialog(slot?: { h: number; m: number }) {
    const avail = getAvailableSlots(60, agendamentos)
    const preferred = slot ? `${slot.h.toString().padStart(2, "0")}:${slot.m.toString().padStart(2, "0")}` : avail[0]?.label ?? "08:00"
    const inicio = avail.some((s) => s.label === preferred) ? preferred : avail[0]?.label ?? "08:00"
    setForm({ inicio, cliente: "", duracao: "60", tipo: "AVULSO", valor: "60", observacao: "" })
    setDialogOpen(true)
  }

  function handleDurationChange(val: string) {
    const duracaoMin = parseInt(val)
    const valor = Math.round((duracaoMin / 60) * 60)
    setForm((f) => {
      const avail = getAvailableSlots(duracaoMin, agendamentos)
      const inicio = avail.some((s) => s.label === f.inicio) ? f.inicio : avail[0]?.label ?? f.inicio
      return { ...f, duracao: val, inicio, valor: f.tipo === "MENSALISTA" ? "0" : String(valor) }
    })
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">Quadra Principal</p>
        </div>
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo</span>
        </Button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-border shrink-0 overflow-x-auto">
        <Button variant="ghost" size="icon" onClick={() => setDate((d) => subDays(d, 1))} className="shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex gap-1 flex-1 justify-center">
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(subDays(date, 3), i)
            const active = dateKey(d) === dateKey(date)
            const today = isToday(d)
            return (
              <button key={i} onClick={() => setDate(d)}
                className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg transition-all shrink-0 ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
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

      {/* Legenda */}
      <div className="flex items-center gap-4 px-4 lg:px-6 py-2 border-b border-border shrink-0">
        {[
          { color: "bg-primary/20 border-primary/40", label: "Confirmado" },
          { color: "bg-yellow-500/20 border-yellow-500/40", label: "Pendente" },
          { color: "bg-muted border-border", label: "Bloqueado" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`w-3 h-3 rounded-sm border ${color}`} />
            {label}
          </div>
        ))}
      </div>

      {/* Grid */}
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
                <div key={slot.label} style={{ height: SLOT_H }}
                  onClick={() => !occupied && openDialog(slot)}
                  className={`border-b transition-colors relative ${slot.m === 0 ? "border-border" : "border-border/30"} ${occupied ? "bg-muted/50 cursor-not-allowed" : "cursor-pointer hover:bg-primary/5"}`}
                >
                  {occupied && <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40" />}
                </div>
              )
            })}

            {agendamentos.map((ag) => {
              const top = toTopPx(ag.inicio.h, ag.inicio.m)
              const height = toDurationPx(ag.duracaoMin)
              const endMin = toMin(ag.inicio.h, ag.inicio.m) + ag.duracaoMin
              const inicioStr = `${ag.inicio.h.toString().padStart(2, "0")}:${ag.inicio.m.toString().padStart(2, "0")}`
              const fimStr = `${Math.floor(endMin / 60).toString().padStart(2, "0")}:${(endMin % 60).toString().padStart(2, "0")}`
              const isTiny = height < 55
              const isCompact = height < 90

              return (
                <div key={ag.id} style={{ top, height, left: 4, right: 4 }}
                  className={`absolute rounded-lg border overflow-hidden cursor-pointer select-none ${statusColor[ag.status]}`}
                >
                  {isTiny ? (
                    <div className="h-full px-3 flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm">{inicioStr} → {fimStr}</span>
                      <span className="text-[10px] font-semibold opacity-70 uppercase tracking-wide shrink-0">Ocupado</span>
                    </div>
                  ) : isCompact ? (
                    <div className="h-full px-3 py-1.5 flex flex-col justify-center gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-sm">{inicioStr} → {fimStr}</span>
                        <span className="text-[10px] font-bold opacity-70 uppercase tracking-wide shrink-0">Ocupado</span>
                      </div>
                      <p className="text-xs opacity-80 truncate">{ag.clienteNome}</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-black/20 px-3 py-1.5 flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-base leading-none tracking-wide">
                          {inicioStr}<span className="opacity-50 mx-1.5 font-normal">→</span>{fimStr}
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {availableSlots.length === 0 && (
              <div className="flex items-start gap-2 px-3 py-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                Não há horários disponíveis para esta duração. Tente uma duração menor ou outro dia.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Data</Label>
                <Input type="date" defaultValue={format(date, "yyyy-MM-dd")} className="bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Início
                  {availableSlots.length > 0 && <span className="ml-1.5 text-primary font-normal">({availableSlots.length} disponíveis)</span>}
                </Label>
                <Select value={inicioValido ? form.inicio : ""} onValueChange={(v) => setForm((f) => ({ ...f, inicio: v }))} disabled={availableSlots.length === 0}>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue placeholder="Nenhum disponível" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-56">
                    {availableSlots.map((s) => <SelectItem key={s.label} value={s.label} className="text-foreground">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Duração</Label>
              <Select value={form.duracao} onValueChange={handleDurationChange}>
                <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {[["60","1 hora"],["90","1h30"],["120","2 horas"],["150","2h30"],["180","3 horas"],["210","3h30"],["240","4 horas"]].map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-foreground">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Input placeholder="Nome do cliente" value={form.cliente} onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))} className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v, valor: v === "MENSALISTA" ? "0" : f.valor }))}>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="AVULSO" className="text-foreground">Avulso</SelectItem>
                    <SelectItem value="MENSALISTA" className="text-foreground">Mensalista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
                <Input type="number" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} disabled={form.tipo === "MENSALISTA"} className="bg-secondary border-border text-foreground disabled:opacity-50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Observação (opcional)</Label>
              <Input placeholder="Ex: trazer bola..." value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button className="flex-1" disabled={availableSlots.length === 0 || !inicioValido} onClick={() => setDialogOpen(false)}>Confirmar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
