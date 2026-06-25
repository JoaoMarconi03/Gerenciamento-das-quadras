"use client"

import { useState, useTransition } from "react"
import { Trophy, Clock, Calendar, Pencil } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { atualizarQuadra } from "./actions"

const DIAS = [
  { key: "SEG", label: "Seg" },
  { key: "TER", label: "Ter" },
  { key: "QUA", label: "Qua" },
  { key: "QUI", label: "Qui" },
  { key: "SEX", label: "Sex" },
  { key: "SAB", label: "Sáb" },
  { key: "DOM", label: "Dom" },
]

function formatarDias(diasStr: string) {
  const dias = diasStr.split(",").map((d) => d.trim())
  if (dias.length === 7) return "Seg – Dom"
  if (dias.length === 6 && !dias.includes("DOM")) return "Seg – Sáb"
  if (dias.length === 5 && !dias.includes("SAB") && !dias.includes("DOM")) return "Seg – Sex"
  return dias
    .map((d) => DIAS.find((x) => x.key === d)?.label ?? d)
    .join(", ")
}

function formatarValor(v: number | null) {
  if (v == null) return "—"
  return `R$ ${v.toFixed(2).replace(".", ",")}`
}

type Quadra = {
  id: string
  nome: string
  descricao: string | null
  ativa: boolean
  horaAbertura: string
  horaFechamento: string
  diasFuncionamento: string
  valor1h: number | null
  valor1h30: number | null
  valor2h: number | null
}

export function QuadraCard({ quadra }: { quadra: Quadra }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    nome:              quadra.nome,
    descricao:         quadra.descricao ?? "",
    horaAbertura:      quadra.horaAbertura   ?? "08:00",
    horaFechamento:    quadra.horaFechamento ?? "23:00",
    diasSel:           (quadra.diasFuncionamento ?? "SEG,TER,QUA,QUI,SEX,SAB,DOM").split(",").map((d) => d.trim()),
    valor1h:           quadra.valor1h   != null ? String(quadra.valor1h)   : "",
    valor1h30:         quadra.valor1h30 != null ? String(quadra.valor1h30) : "",
    valor2h:           quadra.valor2h   != null ? String(quadra.valor2h)   : "",
  })

  function toggleDia(key: string) {
    setForm((f) => ({
      ...f,
      diasSel: f.diasSel.includes(key)
        ? f.diasSel.filter((d) => d !== key)
        : [...f.diasSel, key],
    }))
  }

  function salvar() {
    if (!form.nome.trim() || form.diasSel.length === 0) return

    const diasOrdenados = DIAS.filter((d) => form.diasSel.includes(d.key)).map((d) => d.key)

    startTransition(async () => {
      await atualizarQuadra(quadra.id, {
        nome:              form.nome,
        descricao:         form.descricao,
        horaAbertura:      form.horaAbertura,
        horaFechamento:    form.horaFechamento,
        diasFuncionamento: diasOrdenados.join(","),
        valor1h:           form.valor1h,
        valor1h30:         form.valor1h30,
        valor2h:           form.valor2h,
      })
      setOpen(false)
    })
  }

  return (
    <>
      <Card className="bg-card border-border border-primary/30">
        <CardContent className="p-5">
          {/* Cabeçalho */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">{quadra.nome}</h2>
                  <Badge className="bg-primary/10 text-primary border-primary/30 text-xs border">
                    {quadra.ativa ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                {quadra.descricao && (
                  <p className="text-sm text-muted-foreground mt-0.5">{quadra.descricao}</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-border shrink-0 gap-1.5"
              onClick={() => setOpen(true)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </Button>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Horário de funcionamento</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {quadra.horaAbertura ?? "08:00"} – {quadra.horaFechamento ?? "23:00"}
                </span>
              </div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Dias de funcionamento</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {formatarDias(quadra.diasFuncionamento ?? "SEG,TER,QUA,QUI,SEX,SAB,DOM")}
                </span>
              </div>
            </div>
          </div>

          {/* Valores */}
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Valores por duração
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "1 hora",  val: quadra.valor1h },
                { label: "1h30",    val: quadra.valor1h30 },
                { label: "2 horas", val: quadra.valor2h },
              ].map((v) => (
                <div key={v.label} className="bg-secondary rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">{v.label}</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{formatarValor(v.val)}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Dialog de Edição ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar quadra</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1">
            {/* Nome e descrição */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nome da quadra *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="bg-secondary border-border text-foreground"
                  placeholder="Ex: Quadra Principal"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <Input
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  placeholder="Ex: Gramado sintético, 7 jogadores"
                />
              </div>
            </div>

            {/* Horários */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Horário de funcionamento</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Abertura</p>
                  <Input
                    type="time"
                    value={form.horaAbertura}
                    onChange={(e) => setForm((f) => ({ ...f, horaAbertura: e.target.value }))}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Fechamento</p>
                  <Input
                    type="time"
                    value={form.horaFechamento}
                    onChange={(e) => setForm((f) => ({ ...f, horaFechamento: e.target.value }))}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Dias de funcionamento */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Dias de funcionamento</Label>
              <div className="flex flex-wrap gap-2">
                {DIAS.map((dia) => {
                  const ativo = form.diasSel.includes(dia.key)
                  return (
                    <button
                      key={dia.key}
                      type="button"
                      onClick={() => toggleDia(dia.key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        ativo
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {dia.label}
                    </button>
                  )
                })}
              </div>
              {form.diasSel.length === 0 && (
                <p className="text-xs text-destructive">Selecione ao menos um dia.</p>
              )}
            </div>

            {/* Valores */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Valores por duração (R$)</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "valor1h"   as const, label: "1 hora" },
                  { key: "valor1h30" as const, label: "1h30" },
                  { key: "valor2h"   as const, label: "2 horas" },
                ].map((v) => (
                  <div key={v.key} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{v.label}</p>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={form[v.key]}
                      onChange={(e) => setForm((f) => ({ ...f, [v.key]: e.target.value }))}
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={salvar}
                disabled={isPending || !form.nome.trim() || form.diasSel.length === 0}
              >
                {isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
