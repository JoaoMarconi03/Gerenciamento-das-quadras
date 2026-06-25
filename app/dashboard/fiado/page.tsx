"use client"

import { useState } from "react"
import { Plus, ChevronRight, CheckCircle2, ShoppingCart, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Lancamento = { id: string; descricao: string; valor: number; data: string }
type ContaFiado = {
  id: string
  cliente: string
  telefone: string
  saldo: number
  diaFechamento: number
  lancamentos: Lancamento[]
}

export default function FiadoPage() {
  const [contas, setContas] = useState<ContaFiado[]>([])
  const [contaSelecionada, setContaSelecionada] = useState<ContaFiado | null>(null)

  // Dialogs
  const [dialogNovaConta, setDialogNovaConta] = useState(false)
  const [dialogLancamento, setDialogLancamento] = useState(false)
  const [dialogPagamento, setDialogPagamento] = useState(false)

  // Forms
  const [formNova, setFormNova] = useState({ nome: "", telefone: "", diaFechamento: "30" })
  const [formLanc, setFormLanc] = useState({ descricao: "", valor: "" })
  const [formPag, setFormPag] = useState({ valor: "", observacao: "" })

  const totalPendente = contas.reduce((s, c) => s + c.saldo, 0)

  function handleNovaConta() {
    if (!formNova.nome.trim()) return
    const nova: ContaFiado = {
      id: String(Date.now()),
      cliente: formNova.nome.trim(),
      telefone: formNova.telefone.trim(),
      saldo: 0,
      diaFechamento: Number(formNova.diaFechamento) || 30,
      lancamentos: [],
    }
    setContas((prev) => [...prev, nova])
    setFormNova({ nome: "", telefone: "", diaFechamento: "30" })
    setDialogNovaConta(false)
  }

  function handleLancamento() {
    if (!contaSelecionada || !formLanc.descricao || !formLanc.valor) return
    const valor = parseFloat(formLanc.valor)
    if (isNaN(valor) || valor <= 0) return

    const hoje = new Date()
    const dataStr = `${String(hoje.getDate()).padStart(2, "0")}/${String(hoje.getMonth() + 1).padStart(2, "0")}`

    setContas((prev) =>
      prev.map((c) =>
        c.id === contaSelecionada.id
          ? {
              ...c,
              saldo: c.saldo + valor,
              lancamentos: [
                { id: String(Date.now()), descricao: formLanc.descricao, valor, data: dataStr },
                ...c.lancamentos,
              ],
            }
          : c
      )
    )
    setFormLanc({ descricao: "", valor: "" })
    setDialogLancamento(false)
    setContaSelecionada(null)
  }

  function handlePagamento() {
    if (!contaSelecionada) return
    const valor = parseFloat(formPag.valor)
    if (isNaN(valor) || valor <= 0) return

    setContas((prev) =>
      prev.map((c) =>
        c.id === contaSelecionada.id
          ? { ...c, saldo: Math.max(0, c.saldo - valor) }
          : c
      )
    )
    setFormPag({ valor: "", observacao: "" })
    setDialogPagamento(false)
    setContaSelecionada(null)
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Fiado</h1>
          <p className="text-sm text-muted-foreground">
            Total pendente:{" "}
            <span className="text-yellow-400 font-semibold">
              R$ {totalPendente.toFixed(2).replace(".", ",")}
            </span>
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogNovaConta(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Nova conta
        </Button>
      </div>

      {/* Lista de contas */}
      <div className="space-y-2">
        {contas.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma conta de fiado cadastrada ainda.
          </div>
        )}
        {contas.map((c) => (
          <Card
            key={c.id}
            onClick={() => setContaSelecionada(c)}
            className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer"
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-sm">{c.cliente.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{c.cliente}</p>
                <p className="text-xs text-muted-foreground">
                  {c.telefone || "Sem telefone"} · {c.lancamentos.length} lançamento{c.lancamentos.length !== 1 ? "s" : ""} · fecha dia {c.diaFechamento}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.saldo === 0 ? (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Quitado
                  </span>
                ) : (
                  <span className="text-base font-bold text-yellow-400">
                    R$ {c.saldo.toFixed(2).replace(".", ",")}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Dialog: Nova Conta ── */}
      <Dialog open={dialogNovaConta} onOpenChange={setDialogNovaConta}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Abrir conta no fiado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome *</Label>
              <Input
                placeholder="Nome do cliente"
                value={formNova.nome}
                onChange={(e) => setFormNova((f) => ({ ...f, nome: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Telefone</Label>
              <Input
                type="tel"
                placeholder="(00) 00000-0000"
                value={formNova.telefone}
                onChange={(e) => setFormNova((f) => ({ ...f, telefone: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dia de fechamento</Label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="30"
                value={formNova.diaFechamento}
                onChange={(e) => setFormNova((f) => ({ ...f, diaFechamento: e.target.value }))}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={() => setDialogNovaConta(false)}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleNovaConta} disabled={!formNova.nome.trim()}>
                Abrir conta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Detalhe da conta ── */}
      <Dialog open={!!contaSelecionada} onOpenChange={(o) => !o && setContaSelecionada(null)}>
        {contaSelecionada && (
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center justify-between pr-6">
                <div>
                  <span>{contaSelecionada.cliente}</span>
                  {contaSelecionada.telefone && (
                    <p className="text-xs text-muted-foreground font-normal mt-0.5">
                      {contaSelecionada.telefone}
                    </p>
                  )}
                </div>
                <span className="text-yellow-400 text-lg">
                  R$ {contaSelecionada.saldo.toFixed(2).replace(".", ",")}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {contaSelecionada.lancamentos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sem lançamentos.</p>
              )}
              {contaSelecionada.lancamentos.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm text-foreground">{l.descricao}</p>
                    <p className="text-xs text-muted-foreground">{l.data}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    R$ {l.valor.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-border gap-2"
                onClick={() => {
                  setDialogLancamento(true)
                }}
              >
                <ShoppingCart className="w-4 h-4" />
                Lançar item
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={contaSelecionada.saldo === 0}
                onClick={() => {
                  setFormPag({ valor: String(contaSelecionada.saldo), observacao: "" })
                  setDialogPagamento(true)
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Receber
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Dialog: Lançar item ── */}
      <Dialog
        open={dialogLancamento}
        onOpenChange={(o) => {
          if (!o) { setDialogLancamento(false); setContaSelecionada(null) }
        }}
      >
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Lançar item — {contaSelecionada?.cliente}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Input
                placeholder="Ex: Cerveja 600ml x2"
                value={formLanc.descricao}
                onChange={(e) => setFormLanc((f) => ({ ...f, descricao: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
              <Input
                type="number"
                step="0.50"
                min="0.01"
                placeholder="0,00"
                value={formLanc.valor}
                onChange={(e) => setFormLanc((f) => ({ ...f, valor: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={() => { setDialogLancamento(false); setContaSelecionada(null) }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleLancamento}
                disabled={!formLanc.descricao || !formLanc.valor}
              >
                Lançar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Registrar pagamento ── */}
      <Dialog
        open={dialogPagamento}
        onOpenChange={(o) => {
          if (!o) { setDialogPagamento(false); setContaSelecionada(null) }
        }}
      >
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Receber pagamento — {contaSelecionada?.cliente}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valor recebido (R$)</Label>
              <Input
                type="number"
                step="0.50"
                min="0.01"
                value={formPag.valor}
                onChange={(e) => setFormPag((f) => ({ ...f, valor: e.target.value }))}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Observação</Label>
              <Input
                placeholder="Ex: pago via pix"
                value={formPag.observacao}
                onChange={(e) => setFormPag((f) => ({ ...f, observacao: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={() => { setDialogPagamento(false); setContaSelecionada(null) }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handlePagamento}
                disabled={!formPag.valor}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
