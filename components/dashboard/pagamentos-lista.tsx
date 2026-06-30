"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Pencil, Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { excluirAgendamento, editarAgendamento } from "@/app/dashboard/agendamentos/actions"

type Pagamento = {
  id: string
  inicioHora: string
  fimHora: string
  dataFormatada: string
  dataISO: string
  tipo: string
  valor: string | null
  observacao: string | null
  clienteNome: string | null
  quadraNome: string
}

type FormEdit = {
  nomeCliente: string
  dataISO: string
  horaInicio: string
  horaFim: string
  valor: string
}

export function PagamentosLista({ pagamentos }: { pagamentos: Pagamento[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [erro, setErro] = useState("")
  const [form, setForm] = useState<FormEdit>({
    nomeCliente: "",
    dataISO: "",
    horaInicio: "",
    horaFim: "",
    valor: "",
  })

  if (pagamentos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum pagamento registrado ainda.
      </p>
    )
  }

  function abrirEditar(p: Pagamento) {
    setForm({
      nomeCliente: p.clienteNome ?? p.observacao ?? "",
      dataISO:     p.dataISO,
      horaInicio:  p.inicioHora,
      horaFim:     p.fimHora,
      valor:       p.valor ? String(Number(p.valor)) : "",
    })
    setErro("")
    setEditandoId(p.id)
  }

  function handleExcluir(id: string) {
    if (!window.confirm("Excluir este pagamento?")) return
    setExcluindo(id)
    startTransition(async () => {
      try {
        await excluirAgendamento(id)
        router.refresh()
      } catch {
        alert("Erro ao excluir. Tente novamente.")
      } finally {
        setExcluindo(null)
      }
    })
  }

  function toMin(hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number)
    return h * 60 + m
  }

  async function salvarEdicao() {
    if (!editandoId) return
    setErro("")

    const inicioMin = toMin(form.horaInicio)
    const fimMin    = toMin(form.horaFim)
    if (fimMin <= inicioMin) {
      setErro("Horário de término deve ser após o início.")
      return
    }

    startTransition(async () => {
      try {
        await editarAgendamento(editandoId, {
          nomeCliente: form.nomeCliente.trim(),
          data:        form.dataISO,
          horaInicio:  form.horaInicio,
          duracaoMin:  fimMin - inicioMin,
          valor:       parseFloat(form.valor.replace(",", ".")) || 0,
        })
        setEditandoId(null)
        router.refresh()
      } catch {
        setErro("Erro ao salvar. Tente novamente.")
      }
    })
  }

  return (
    <>
      <div className="space-y-2">
        {pagamentos.map((p) => {
          const nome = p.clienteNome ?? p.observacao ?? "Avulso"
          const isExcluindo = excluindo === p.id
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 py-3 px-3 rounded-lg bg-secondary/50 transition-opacity ${isExcluindo ? "opacity-40" : ""}`}
            >
              <div className="shrink-0 text-center min-w-[60px]">
                <p className="text-xs font-bold text-foreground">{p.dataFormatada}</p>
                <p className="text-xs text-muted-foreground">
                  {p.inicioHora}–{p.fimHora}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{nome}</p>
                <p className="text-xs text-muted-foreground">{p.quadraNome}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                {p.valor != null && (
                  <span className="text-sm font-semibold text-green-600">
                    R$ {Number(p.valor).toFixed(2).replace(".", ",")}
                  </span>
                )}
                <button
                  title="Editar"
                  disabled={isExcluindo || pending}
                  onClick={() => abrirEditar(p)}
                  className="p-1.5 rounded hover:bg-secondary transition-colors disabled:opacity-40 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  title="Excluir"
                  disabled={isExcluindo || pending}
                  onClick={() => handleExcluir(p.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 transition-colors disabled:opacity-40 text-muted-foreground hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dialog de edição */}
      <Dialog open={!!editandoId} onOpenChange={(open) => { if (!pending) { if (!open) setEditandoId(null) } }}>
        <DialogContent className="bg-card border-border w-full max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg">Editar Agendamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1 pb-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nome do Cliente
              </Label>
              <Input
                value={form.nomeCliente}
                onChange={(e) => setForm((f) => ({ ...f, nomeCliente: e.target.value }))}
                className="bg-secondary border-border text-foreground h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Data
              </Label>
              <Input
                type="date"
                value={form.dataISO}
                onChange={(e) => setForm((f) => ({ ...f, dataISO: e.target.value }))}
                className="bg-secondary border-border text-foreground h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Início
                </Label>
                <Input
                  type="time"
                  value={form.horaInicio}
                  onChange={(e) => setForm((f) => ({ ...f, horaInicio: e.target.value }))}
                  className="bg-secondary border-border text-foreground h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Término
                </Label>
                <Input
                  type="time"
                  value={form.horaFim}
                  onChange={(e) => setForm((f) => ({ ...f, horaFim: e.target.value }))}
                  className="bg-secondary border-border text-foreground h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Valor (R$)
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
                  className="bg-secondary border-border text-foreground h-11 pl-9"
                />
              </div>
            </div>

            {erro && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {erro}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-11 border-border"
                onClick={() => setEditandoId(null)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-11"
                onClick={salvarEdicao}
                disabled={pending || !form.nomeCliente.trim()}
              >
                {pending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
