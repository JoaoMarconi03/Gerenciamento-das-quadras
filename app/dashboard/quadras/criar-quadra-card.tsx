"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { criarQuadra } from "./actions"

const DIAS = [
  { key: "SEG", label: "Seg" },
  { key: "TER", label: "Ter" },
  { key: "QUA", label: "Qua" },
  { key: "QUI", label: "Qui" },
  { key: "SEX", label: "Sex" },
  { key: "SAB", label: "Sáb" },
  { key: "DOM", label: "Dom" },
]

const FORM_INICIAL = {
  nome:           "",
  descricao:      "",
  endereco:       "",
  horaAbertura:   "08:00",
  horaFechamento: "22:00",
  diasSel:        ["SEG","TER","QUA","QUI","SEX","SAB","DOM"],
  valor1h:        "",
  valor1h30:      "",
  valor2h:        "",
}

export function CriarQuadraCard() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState(FORM_INICIAL)

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
      await criarQuadra({
        nome:              form.nome,
        descricao:         form.descricao,
        endereco:          form.endereco,
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
      <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground text-sm">Nenhuma quadra cadastrada ainda.</p>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Cadastrar quadra
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Cadastrar quadra</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1">
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
                <Label className="text-xs text-muted-foreground">Endereço</Label>
                <Input
                  value={form.endereco}
                  onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  placeholder="Ex: Rua das Flores, 123 – Votocel"
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
                {isPending ? "Cadastrando…" : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
