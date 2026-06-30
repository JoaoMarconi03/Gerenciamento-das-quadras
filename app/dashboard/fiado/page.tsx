"use client"

import { useState, useEffect, useTransition } from "react"
import { ChevronRight, CheckCircle2, ShoppingCart, UserPlus, Search, X } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  buscarContas,
  criarConta,
  lancarItem,
  registrarPagamento,
  buscarProdutosAtivos,
  buscarClientesParaFiado,
} from "./actions"

type Lancamento = { id: string; descricao: string; valor: number; data: string }
type Conta = {
  id: string
  clienteNome: string
  clienteTelefone: string
  diaFechamento: number
  saldo: number
  lancamentos: Lancamento[]
}
type Produto = { id: string; nome: string; preco: number }
type ClienteFiado = { id: string; nome: string; telefone: string | null; temConta: boolean }

export default function FiadoPage() {
  const [contas, setContas]               = useState<Conta[]>([])
  const [produtos, setProdutos]           = useState<Produto[]>([])
  const [contaSelecionada, setContaSel]   = useState<Conta | null>(null)
  const [isPending, startTransition]      = useTransition()

  // dialogs
  const [dialogNovaConta, setDialogNovaConta]   = useState(false)
  const [dialogLancamento, setDialogLancamento] = useState(false)
  const [dialogPagamento, setDialogPagamento]   = useState(false)

  // nova conta — modo e dados
  const [modoNovaConta, setModoNovaConta]   = useState<"existente" | "novo">("existente")
  const [clientesFiado, setClientesFiado]   = useState<ClienteFiado[]>([])
  const [buscaCliente, setBuscaCliente]     = useState("")
  const [clienteSel, setClienteSel]         = useState<ClienteFiado | null>(null)
  const [erroNovaConta, setErroNovaConta]   = useState("")
  const [formNova, setFormNova] = useState({ nome: "", telefone: "", diaFechamento: "30" })
  const [formLanc, setFormLanc] = useState({ produtoId: "", quantidade: "1" })
  const [formPag,  setFormPag]  = useState({ valor: "", observacao: "" })

  async function recarregar() {
    const lista = await buscarContas()
    setContas(lista)
  }

  useEffect(() => {
    recarregar()
    buscarProdutosAtivos().then(setProdutos)
  }, [])

  function abrirDialogNovaConta() {
    setModoNovaConta("existente")
    setBuscaCliente("")
    setClienteSel(null)
    setErroNovaConta("")
    setFormNova({ nome: "", telefone: "", diaFechamento: "30" })
    buscarClientesParaFiado().then(setClientesFiado)
    setDialogNovaConta(true)
  }

  const totalPendente = contas.reduce((s, c) => s + c.saldo, 0)

  // produto selecionado e preview do valor
  const produtoSel   = produtos.find((p) => p.id === formLanc.produtoId)
  const qtd          = Math.max(1, parseInt(formLanc.quantidade) || 1)
  const valorPreview = produtoSel ? produtoSel.preco * qtd : 0

  // ── handlers ──────────────────────────────────────────────────────────────

  function handleAbrirConta(conta: Conta) {
    setContaSel(conta)
  }

  function handleNovaConta() {
    setErroNovaConta("")
    const diaFechamento = Number(formNova.diaFechamento) || 30

    if (modoNovaConta === "existente" && !clienteSel) {
      setErroNovaConta("Selecione um cliente da lista.")
      return
    }
    if (modoNovaConta === "novo" && !formNova.nome.trim()) {
      setErroNovaConta("Nome é obrigatório.")
      return
    }

    startTransition(async () => {
      const resultado = await criarConta(
        modoNovaConta === "existente"
          ? { clienteId: clienteSel!.id, diaFechamento }
          : { nome: formNova.nome.trim(), telefone: formNova.telefone.trim(), diaFechamento }
      )
      if (!resultado.ok) {
        setErroNovaConta(resultado.erro ?? "Erro ao abrir conta.")
        return
      }
      await recarregar()
      setDialogNovaConta(false)
    })
  }

  function handleLancamento() {
    if (!contaSelecionada || !formLanc.produtoId) return
    startTransition(async () => {
      await lancarItem({
        contaId:    contaSelecionada.id,
        produtoId:  formLanc.produtoId,
        quantidade: qtd,
      })
      const lista = await buscarContas()
      setContas(lista)
      const atualizada = lista.find((c) => c.id === contaSelecionada.id) ?? null
      setContaSel(atualizada)
      setFormLanc({ produtoId: "", quantidade: "1" })
      setDialogLancamento(false)
    })
  }

  function handlePagamento() {
    if (!contaSelecionada) return
    const valor = parseFloat(formPag.valor)
    if (isNaN(valor) || valor <= 0) return
    startTransition(async () => {
      await registrarPagamento({
        contaId:    contaSelecionada.id,
        valor,
        observacao: formPag.observacao.trim() || null,
      })
      const lista = await buscarContas()
      setContas(lista)
      setContaSel(null)
      setFormPag({ valor: "", observacao: "" })
      setDialogPagamento(false)
    })
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Fiado</h1>
          <p className="text-sm text-muted-foreground">
            Total pendente:{" "}
            <span className="text-yellow-600 font-semibold">
              R$ {totalPendente.toFixed(2).replace(".", ",")}
            </span>
          </p>
        </div>
        <Button size="sm" onClick={abrirDialogNovaConta} className="gap-2">
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
            onClick={() => handleAbrirConta(c)}
            className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer"
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-sm">{c.clienteNome.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{c.clienteNome}</p>
                <p className="text-xs text-muted-foreground">
                  {c.clienteTelefone || "Sem telefone"} · {c.lancamentos.length} lançamento{c.lancamentos.length !== 1 ? "s" : ""} · fecha dia {c.diaFechamento}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.saldo === 0 ? (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Quitado
                  </span>
                ) : (
                  <span className="text-base font-bold text-yellow-600">
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
      <Dialog open={dialogNovaConta} onOpenChange={(o) => { if (!isPending) setDialogNovaConta(o) }}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Abrir conta no fiado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">

            {/* Toggle modo */}
            <div className="flex rounded-lg bg-secondary p-1 gap-1">
              <button
                onClick={() => { setModoNovaConta("existente"); setErroNovaConta("") }}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                  modoNovaConta === "existente"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Cliente cadastrado
              </button>
              <button
                onClick={() => { setModoNovaConta("novo"); setErroNovaConta("") }}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                  modoNovaConta === "novo"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Novo cliente
              </button>
            </div>

            {/* Modo: cliente existente */}
            {modoNovaConta === "existente" && (
              <div className="space-y-2">
                {clienteSel ? (
                  <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/30 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{clienteSel.nome}</p>
                      {clienteSel.telefone && (
                        <p className="text-xs text-muted-foreground">{clienteSel.telefone}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setClienteSel(null); setBuscaCliente("") }}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Buscar por nome ou telefone..."
                        value={buscaCliente}
                        onChange={(e) => setBuscaCliente(e.target.value)}
                        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground pl-9"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                      {clientesFiado.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum cliente cadastrado ainda.
                        </p>
                      )}
                      {clientesFiado
                        .filter((c) => {
                          const q = buscaCliente.toLowerCase()
                          return (
                            !q ||
                            c.nome.toLowerCase().includes(q) ||
                            (c.telefone ?? "").includes(q)
                          )
                        })
                        .map((c) => (
                          <button
                            key={c.id}
                            disabled={c.temConta}
                            onClick={() => setClienteSel(c)}
                            className={`w-full text-left px-3 py-2.5 transition-colors ${
                              c.temConta
                                ? "opacity-40 cursor-not-allowed bg-secondary/30"
                                : "hover:bg-secondary/60"
                            }`}
                          >
                            <p className="text-sm font-medium text-foreground">{c.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.telefone ?? "Sem telefone"}
                              {c.temConta && " · já possui conta"}
                            </p>
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Modo: novo cliente */}
            {modoNovaConta === "novo" && (
              <>
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
              </>
            )}

            {/* Dia de fechamento (ambos os modos) */}
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

            {erroNovaConta && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {erroNovaConta}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogNovaConta(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleNovaConta} disabled={isPending}>
                {isPending ? "Salvando..." : "Abrir conta"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Detalhe da conta ── */}
      <Dialog open={!!contaSelecionada && !dialogLancamento && !dialogPagamento} onOpenChange={(o) => !o && setContaSel(null)}>
        {contaSelecionada && (
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center justify-between pr-6">
                <div>
                  <span>{contaSelecionada.clienteNome}</span>
                  {contaSelecionada.clienteTelefone && (
                    <p className="text-xs text-muted-foreground font-normal mt-0.5">
                      {contaSelecionada.clienteTelefone}
                    </p>
                  )}
                </div>
                <span className={contaSelecionada.saldo === 0 ? "text-primary text-base" : "text-yellow-600 text-lg"}>
                  {contaSelecionada.saldo === 0
                    ? "Quitado"
                    : `R$ ${contaSelecionada.saldo.toFixed(2).replace(".", ",")}`}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {contaSelecionada.lancamentos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sem lançamentos.</p>
              )}
              {contaSelecionada.lancamentos.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
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
                  setFormLanc({ produtoId: "", quantidade: "1" })
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
                  setFormPag({ valor: String(contaSelecionada.saldo.toFixed(2)), observacao: "" })
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
      <Dialog open={dialogLancamento} onOpenChange={(o) => { if (!o) setDialogLancamento(false) }}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Lançar item — {contaSelecionada?.clienteNome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Produto</Label>
              <Select value={formLanc.produtoId} onValueChange={(v) => setFormLanc((f) => ({ ...f, produtoId: v }))}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {produtos.length === 0 && (
                    <SelectItem value="__empty" disabled className="text-muted-foreground">
                      Nenhum produto cadastrado
                    </SelectItem>
                  )}
                  {produtos.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-foreground">
                      {p.nome} — R$ {p.preco.toFixed(2).replace(".", ",")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={formLanc.quantidade}
                onChange={(e) => setFormLanc((f) => ({ ...f, quantidade: e.target.value }))}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            {produtoSel && (
              <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-base font-bold text-primary">
                  R$ {valorPreview.toFixed(2).replace(".", ",")}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogLancamento(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleLancamento}
                disabled={!formLanc.produtoId || isPending}
              >
                {isPending ? "Salvando..." : "Lançar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Registrar pagamento ── */}
      <Dialog open={dialogPagamento} onOpenChange={(o) => { if (!o) setDialogPagamento(false) }}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Receber pagamento — {contaSelecionada?.clienteNome}
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
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogPagamento(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handlePagamento} disabled={!formPag.valor || isPending}>
                {isPending ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
