"use client"

import { useState, useEffect } from "react"
import {
  format, addDays, isToday, startOfWeek, addWeeks, subWeeks, endOfMonth, isAfter,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays,
  Repeat2, AlertTriangle, CheckCircle2, Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  buscarAgendamentosPorSemana,
  type AgendamentoSemana,
  criarAgendamentoAdmin,
  criarAgendamentosMensaisAdmin,
  editarAgendamento,
  excluirAgendamento,
} from "@/app/dashboard/agendamentos/actions"

// ── Constantes ────────────────────────────────────────────────────────────────

const SLOT_H = 56   // px por bloco de 30 min

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Precos = { valor1h?: number; valor1h30?: number; valor2h?: number }
type FormState = {
  tipo: "AVULSO" | "MENSALISTA"; cliente: string; clienteId: string | null
  dataSel: Date; inicio: string; fim: string; valor: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMin(h: number, m: number) { return h * 60 + m }
function fmt(h: number, m: number)   { return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}` }
function dateKey(d: Date)            { return format(d, "yyyy-MM-dd") }
function localDate(s: string)        { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d) }

function parseHora(hhmm: string, def24?: boolean) {
  const [h, m] = hhmm.split(":").map(Number)
  if (def24 && h === 0 && m === 0) return 24 * 60
  return h * 60 + m
}

function buildSlots(startMin: number, endMin: number) {
  const count = (endMin - startMin) / 30
  return Array.from({ length: count }, (_, i) => {
    const min = startMin + i * 30
    const h = Math.floor(min / 60), m = min % 60
    return { label: `${(h % 24).toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`, min }
  })
}

function buildSlotsFim(startMin: number, endMin: number) {
  const count = (endMin - startMin) / 30 + 1
  return Array.from({ length: count }, (_, i) => {
    const min = startMin + i * 30
    const h = Math.floor(min / 60), m = min % 60
    const value = `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`
    const label = `${(h % 24).toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`
    return { value, label, min }
  })
}

function calcConflitos(ini: string, fim: string, ags: AgendamentoSemana[], excId?: string) {
  const [ih, im] = ini.split(":").map(Number)
  const [fh, fm] = fim.split(":").map(Number)
  const s = toMin(ih, im), e = toMin(fh, fm)
  if (e <= s) return []
  return ags.filter((a) => a.status !== "CANCELADO" && a.id !== excId)
            .filter((a) => { const agStart = toMin(a.inicio.h, a.inicio.m); return s < agStart + a.duracaoMin && e > agStart })
}

function gerarDatasMensais(data: Date) {
  const fim = endOfMonth(data); const arr: Date[] = []; let cur = data
  while (!isAfter(cur, fim)) { arr.push(new Date(cur)); cur = addWeeks(cur, 1) }
  return arr
}

function valorParaDuracao(min: number, precos: Precos) {
  if (min === 60  && precos.valor1h   != null) return String(precos.valor1h)
  if (min === 90  && precos.valor1h30 != null) return String(precos.valor1h30)
  if (min === 120 && precos.valor2h   != null) return String(precos.valor2h)
  return ""
}

const STATUS_BG: Record<string, string> = {
  CONFIRMADO: "bg-primary/20 border-l-2 border-primary text-primary",
  PENDENTE:   "bg-yellow-400/20 border-l-2 border-yellow-500 text-yellow-700 dark:text-yellow-300",
  PAGO:       "bg-green-500/20 border-l-2 border-green-500 text-green-700 dark:text-green-400",
  CANCELADO:  "bg-red-500/15 border-l-2 border-red-500 text-red-600",
}

// ── Componente ────────────────────────────────────────────────────────────────

export function CalendarioAgendamentos({
  quadraId, quadraNome, precos = {}, clienteFixo,
  horaAbertura = "08:00", horaFechamento = "23:00",
}: {
  quadraId: string; quadraNome: string; precos?: Precos
  clienteFixo?: { id: string; nome: string }
  horaAbertura?: string; horaFechamento?: string
}) {
  const INICIO_MIN = parseHora(horaAbertura)
  const FIM_MIN    = parseHora(horaFechamento, true)

  const slots    = buildSlots(INICIO_MIN, FIM_MIN)
  const slotsFim = buildSlotsFim(INICIO_MIN, FIM_MIN)
  // Horas cheias para labels
  const horasLabels = slots.filter((s) => s.min % 60 === 0)

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [agendamentos, setAgendamentos] = useState<AgendamentoSemana[]>([])
  const [carregando, setCarregando]     = useState(false)
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editandoId, setEditandoId]     = useState<string | null>(null)
  const [salvando, setSalvando]         = useState(false)
  const [excluindo, setExcluindo]       = useState<string | null>(null)
  const [confirmarEx, setConfirmarEx]   = useState<string | null>(null)
  const [erro, setErro]                 = useState("")
  const [sucesso, setSucesso]           = useState("")
  const [calAberto, setCalAberto]       = useState(false)

  const [form, setForm] = useState<FormState>({
    tipo: "AVULSO", cliente: "", clienteId: null, dataSel: new Date(),
    inicio: horaAbertura,
    fim: fmt(Math.floor(Math.min(INICIO_MIN + 60, FIM_MIN) / 60) % 24, Math.min(INICIO_MIN + 60, FIM_MIN) % 60),
    valor: "",
  })

  const weekKey  = dateKey(weekStart)
  const weekDias = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = dateKey(startOfWeek(new Date(), { weekStartsOn: 1 })) === weekKey

  useEffect(() => {
    let ativo = true
    const buscar = (inicial?: boolean) => {
      if (inicial) setCarregando(true)
      buscarAgendamentosPorSemana(weekKey)
        .then((dados) => { if (ativo) setAgendamentos(dados) })
        .catch(console.error)
        .finally(() => { if (ativo && inicial) setCarregando(false) })
    }
    buscar(true)
    const id = setInterval(() => buscar(), 30_000)
    return () => { ativo = false; clearInterval(id) }
  }, [weekKey])

  useEffect(() => { if (clienteFixo) abrirDialog() }, [clienteFixo?.id])

  const agsPorDia: Record<string, AgendamentoSemana[]> = {}
  agendamentos.forEach((ag) => {
    if (!agsPorDia[ag.inicioData]) agsPorDia[ag.inicioData] = []
    agsPorDia[ag.inicioData].push(ag)
  })

  const agsNoDia        = agendamentos.filter((a) => a.inicioData === dateKey(form.dataSel))
  const conflitosDialog = calcConflitos(form.inicio, form.fim, agsNoDia, editandoId ?? undefined)
  const temConflito     = conflitosDialog.length > 0
  // Evita spread de array em TypeScript strict — calcula inline
  const iniParts  = form.inicio.split(":")
  const fimParts  = form.fim.split(":")
  const iniTotalMin = Number(iniParts[0]) * 60 + Number(iniParts[1] ?? 0)
  const fimTotalMin = Number(fimParts[0]) * 60 + Number(fimParts[1] ?? 0)
  const fimValido       = fimTotalMin > iniTotalMin
  const formValido      = !!form.cliente.trim() && fimValido
  const datasMensais    = form.tipo === "MENSALISTA" ? gerarDatasMensais(form.dataSel) : []

  // ── Handlers ──────────────────────────────────────────────────────────────

  function abrirDialog(dia?: Date) {
    const d = dia ?? new Date()
    const fimMin = Math.min(INICIO_MIN + 60, FIM_MIN)
    const va = valorParaDuracao(fimMin - INICIO_MIN, precos)
    setForm({
      tipo: "AVULSO", cliente: clienteFixo?.nome ?? "", clienteId: clienteFixo?.id ?? null,
      dataSel: d, inicio: horaAbertura,
      fim: fmt(Math.floor(fimMin / 60) % 24, fimMin % 60), valor: va,
    })
    setEditandoId(null); setErro(""); setSucesso(""); setDialogOpen(true)
  }

  function abrirDialogEditar(ag: AgendamentoSemana) {
    const fimMin = toMin(ag.inicio.h, ag.inicio.m) + ag.duracaoMin
    setForm({
      tipo: ag.tipo, cliente: ag.clienteNome, clienteId: null,
      dataSel: localDate(ag.inicioData), inicio: ag.inicioHora,
      fim: fmt(Math.floor(fimMin / 60), fimMin % 60),
      valor: ag.valor > 0 ? String(ag.valor) : "",
    })
    setEditandoId(ag.id); setErro(""); setSucesso(""); setDialogOpen(true)
  }

  async function confirmarEExcluir() {
    if (!confirmarEx) return
    const id = confirmarEx
    setConfirmarEx(null)
    setExcluindo(id)
    try {
      await excluirAgendamento(id)
      const novos = await buscarAgendamentosPorSemana(weekKey)
      setAgendamentos(novos)
    } catch (err) {
      console.error("Erro ao excluir:", err)
    } finally {
      setExcluindo(null)
    }
  }

  async function confirmar() {
    if (!formValido) return
    if (!quadraId) {
      setErro("Nenhuma quadra configurada. Cadastre uma quadra primeiro.")
      return
    }
    setDialogOpen(false)   // fecha o dialog ANTES de mostrar o overlay
    setSalvando(true)
    setErro("")
    setSucesso("")
    try {
      const dataISO    = format(form.dataSel, "yyyy-MM-dd")
      const valorNum   = form.valor.trim() === "" ? 0 : parseFloat(form.valor.replace(",", "."))
      const duracaoMin = fimTotalMin - iniTotalMin

      if (editandoId) {
        await editarAgendamento(editandoId, {
          nomeCliente: form.cliente.trim(),
          data: dataISO,
          horaInicio: form.inicio,
          duracaoMin,
          valor: valorNum,
        })
      } else if (form.tipo === "AVULSO") {
        await criarAgendamentoAdmin({
          quadraId,
          nomeCliente: form.cliente.trim(),
          clienteId:   form.clienteId ?? undefined,
          data:        dataISO,
          horaInicio:  form.inicio,
          duracaoMin,
          tipo:        "AVULSO",
          valor:       valorNum,
        })
      } else {
        await criarAgendamentosMensaisAdmin({
          quadraId,
          nomeCliente: form.cliente.trim(),
          clienteId:   form.clienteId ?? undefined,
          dataInicio:  dataISO,
          horaInicio:  form.inicio,
          duracaoMin,
          valor:       valorNum,
        })
      }

      // Atualiza o calendário com os dados novos
      const novos = await buscarAgendamentosPorSemana(weekKey)
      setAgendamentos(novos)
      setEditandoId(null)
    } catch (err) {
      console.error("Erro ao salvar agendamento:", err)
      // Reabre o dialog com a mensagem de erro
      setErro(err instanceof Error ? err.message : "Erro ao salvar. Tente novamente.")
      setDialogOpen(true)
    } finally {
      setSalvando(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const totalH = (FIM_MIN - INICIO_MIN) / 30 * SLOT_H   // altura total da grade

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-border shrink-0 gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">{quadraNome}</p>
        </div>
        <Button onClick={() => abrirDialog()} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo agendamento</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Navegação semanal */}
      <div className="flex items-center gap-2 px-4 lg:px-6 py-2.5 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <p className="flex-1 text-center text-sm font-semibold text-foreground">
          {format(weekStart, "dd/MM", { locale: ptBR })} – {format(addDays(weekStart, 6), "dd/MM/yyyy", { locale: ptBR })}
        </p>
        <Button variant="ghost" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        {!isCurrentWeek && (
          <Button variant="outline" size="sm" className="text-xs border-border shrink-0"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            <CalendarDays className="w-3.5 h-3.5 mr-1" />Hoje
          </Button>
        )}
      </div>

      {/* ── Calendário: header sticky + corpo rolável em um único container ── */}
      <div className="flex flex-1 overflow-auto">
        {/* Wrapper único garante que header e colunas tenham a mesma largura */}
        <div className="flex flex-col flex-1 min-w-[476px]">

          {/* Cabeçalho dos dias — sticky enquanto o usuário rola verticalmente */}
          <div className="flex shrink-0 sticky top-0 z-20 bg-background border-b border-border">
            <div className="w-14 shrink-0" />
            {weekDias.map((dia) => {
              const hoje = isToday(dia)
              return (
                <button
                  key={dateKey(dia)} type="button"
                  onClick={() => abrirDialog(dia)}
                  className={`flex-1 py-2.5 text-center border-l border-border transition-colors hover:bg-secondary/50 ${hoje ? "bg-primary/5" : ""}`}
                >
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                    {format(dia, "EEE", { locale: ptBR }).replace(".", "")}
                  </p>
                  <p className={`text-xl font-bold leading-tight mt-0.5 ${hoje ? "text-primary" : "text-foreground"}`}>
                    {format(dia, "d")}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Corpo: coluna de horas + 7 colunas de dias */}
          {/* paddingTop deixa espaço para o label do primeiro horário não ser cortado */}
          <div className="flex" style={{ height: totalH + 20, paddingTop: 20 }}>

            {/* Coluna de horas */}
            <div className="w-14 shrink-0 relative" style={{ height: totalH }}>
              {horasLabels.map((s) => (
                <div
                  key={s.min}
                  style={{ top: (s.min - INICIO_MIN) / 30 * SLOT_H - 8 }}
                  className="absolute right-0 w-full flex justify-end pr-2"
                >
                  <span className="text-[10px] text-muted-foreground font-medium leading-none">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* 7 colunas de dias */}
            <div className="flex flex-1">
              {weekDias.map((dia) => {
                const key = dateKey(dia)
                const ags = agsPorDia[key] ?? []
                const hoje = isToday(dia)

                return (
                  <div
                    key={key}
                    className={`flex-1 relative border-l border-border ${hoje ? "bg-primary/[0.02]" : ""}`}
                    style={{ height: totalH }}
                  >
                    {/* Linhas de hora cheia */}
                    {horasLabels.map((s) => (
                      <div
                        key={s.min}
                        style={{ top: (s.min - INICIO_MIN) / 30 * SLOT_H }}
                        className="absolute inset-x-0 border-t border-border/50 pointer-events-none"
                      />
                    ))}
                    {/* Linhas de meia hora */}
                    {slots.filter((s) => s.min % 60 !== 0).map((s) => (
                      <div
                        key={s.min}
                        style={{ top: (s.min - INICIO_MIN) / 30 * SLOT_H }}
                        className="absolute inset-x-0 border-t border-border/20 pointer-events-none"
                      />
                    ))}

                    {/* Área clicável para criar agendamento */}
                    <div className="absolute inset-0 cursor-pointer" onClick={() => abrirDialog(dia)} />

                    {/* Blocos de agendamento */}
                    {ags.map((ag) => {
                      const top    = (toMin(ag.inicio.h, ag.inicio.m) - INICIO_MIN) / 30 * SLOT_H
                      const height = Math.max(ag.duracaoMin / 30 * SLOT_H, SLOT_H * 0.8)
                      const tiny   = height < SLOT_H * 1.2
                      const isExc  = excluindo === ag.id

                      return (
                        <div
                          key={ag.id}
                          style={{ top: top + 1, height: height - 2, left: 2, right: 2, position: "absolute", zIndex: 10 }}
                          onClick={(e) => { e.stopPropagation(); abrirDialogEditar(ag) }}
                          className={`rounded-md overflow-hidden cursor-pointer group select-none transition-opacity ${STATUS_BG[ag.status] ?? STATUS_BG.CONFIRMADO} ${isExc ? "opacity-40 pointer-events-none" : ""}`}
                        >
                          <div className="px-1.5 py-1 h-full flex flex-col justify-center relative">
                            <p className={`font-semibold leading-tight truncate ${tiny ? "text-[10px]" : "text-xs"}`}>
                              {ag.clienteNome}
                            </p>
                            {!tiny && (
                              <p className="font-mono text-[10px] opacity-70 mt-0.5">{ag.inicioHora}–{ag.fimHora}</p>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setConfirmarEx(ag.id) }}
                              className="absolute top-0.5 right-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-black/15 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── Overlay de carregamento (salvar / excluir) ── */}
      {(salvando || !!excluindo) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl px-10 py-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full border-[3px] border-primary/25 border-t-primary animate-spin" />
            <p className="text-sm font-semibold text-foreground">
              {!!excluindo ? "Excluindo agendamento…" : "Salvando agendamento…"}
            </p>
          </div>
        </div>
      )}

      {/* Dialog: Confirmar exclusão */}
      <Dialog open={!!confirmarEx} onOpenChange={(o) => { if (!o) setConfirmarEx(null) }}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-foreground">Excluir agendamento</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">Tem certeza? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setConfirmarEx(null)}>Cancelar</Button>
              <Button variant="destructive" className="flex-1" onClick={confirmarEExcluir}>Excluir</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo / Editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditandoId(null); setErro("") } }}>
        <DialogContent className="bg-card border-border w-full max-w-md mx-auto max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg">
              {editandoId ? "Editar Agendamento" : "Novo Agendamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1 pb-2">

            {!editandoId && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</Label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: "AVULSO",     label: "Avulso",     desc: "Dia único",  Icon: CalendarDays },
                    { value: "MENSALISTA", label: "Mensalista", desc: "Todo o mês", Icon: Repeat2      },
                  ] as const).map(({ value, label, desc, Icon }) => (
                    <button key={value} type="button" onClick={() => setForm((f) => ({ ...f, tipo: value }))}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${form.tipo === value ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40"}`}>
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome do Cliente</Label>
              {form.clienteId ? (
                <div className="flex items-center gap-2 h-11 px-3 rounded-md border border-primary/40 bg-primary/5">
                  <span className="text-sm font-semibold text-foreground flex-1 truncate">{form.cliente}</span>
                  <span className="text-[10px] font-semibold uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded-md shrink-0">Vinculado</span>
                </div>
              ) : (
                <Input placeholder="Ex: João Silva" value={form.cliente}
                  onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11" />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</Label>
              <Popover open={calAberto} onOpenChange={setCalAberto}>
                <PopoverTrigger asChild>
                  <button type="button" className="w-full h-11 flex items-center gap-2 px-3 rounded-md border border-border bg-secondary text-foreground text-sm hover:bg-secondary/80 transition-colors">
                    <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                    {format(form.dataSel, "dd/MM/yyyy")}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-2">
                  <Calendar mode="single" selected={form.dataSel} locale={ptBR}
                    onSelect={(d) => { if (d) { setForm((f) => ({ ...f, dataSel: d })); setCalAberto(false) } }} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Início</Label>
                <Select value={form.inicio} onValueChange={(v) => {
                  const [ih, im] = v.split(":").map(Number)
                  const fimMin = Math.min(ih * 60 + im + 60, FIM_MIN)
                  const novoFim = fmt(Math.floor(fimMin / 60), fimMin % 60)
                  const [fh, fm] = form.fim.split(":").map(Number)
                  const fimEfetivo = toMin(fh, fm) > toMin(ih, im) ? form.fim : novoFim
                  const [efh, efm] = fimEfetivo.split(":").map(Number)
                  const va = valorParaDuracao(toMin(efh, efm) - toMin(ih, im), precos)
                  setForm((f) => ({ ...f, inicio: v, fim: fimEfetivo, valor: va !== "" ? va : f.valor }))
                }}>
                  <SelectTrigger className="bg-secondary border-border text-foreground h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-56">
                    {slots.map((s) => <SelectItem key={s.label} value={s.label} className="text-foreground">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Término</Label>
                <Select value={form.fim} onValueChange={(v) => {
                  const [ih, im] = form.inicio.split(":").map(Number)
                  const [fh, fm] = v.split(":").map(Number)
                  const va = valorParaDuracao(toMin(fh, fm) - toMin(ih, im), precos)
                  setForm((f) => ({ ...f, fim: v, valor: va !== "" ? va : f.valor }))
                }}>
                  <SelectTrigger className="bg-secondary border-border text-foreground h-11">
                    <SelectValue>{form.fim === "24:00" ? "00:00" : form.fim}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-56">
                    {slotsFim.filter((s) => { const [ih, im] = form.inicio.split(":").map(Number); return s.min > toMin(ih, im) })
                      .map((s) => <SelectItem key={s.value} value={s.value} className="text-foreground">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.tipo === "MENSALISTA" && !editandoId && datasMensais.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Repeat2 className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-sm font-semibold text-foreground">
                    {datasMensais.length} agendamento{datasMensais.length !== 1 ? "s" : ""} serão criados
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {datasMensais.map((d, i) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">{format(d, "dd/MM")}</span>
                  ))}
                </div>
              </div>
            )}

            {temConflito && (
              <div className="flex gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Conflito de horário</p>
                  <ul className="space-y-0.5">
                    {conflitosDialog.map((c) => (
                      <li key={c.id} className="text-xs font-medium">• {c.clienteNome} — {c.inicioHora} às {c.fimHora}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor por sessão (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                <Input type="text" inputMode="decimal" placeholder="0,00" value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11 pl-9" />
              </div>
            </div>

            {erro && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />{erro}
              </div>
            )}
            {sucesso && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />{sucesso}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 h-11 border-border" disabled={salvando}
                onClick={() => { setDialogOpen(false); setEditandoId(null) }}>Cancelar</Button>
              <Button className="flex-1 h-11 font-semibold" onClick={confirmar}
                disabled={!formValido || salvando || temConflito}>
                {salvando ? "Salvando..." : editandoId ? "Salvar" : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
