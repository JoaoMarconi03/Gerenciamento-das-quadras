"use client"

import { useState, useEffect, useTransition } from "react"
import {
  Plus, Search, Trash2, X, CheckCircle2,
  Banknote, Smartphone, CreditCard, Phone, User, Clock,
  ShoppingBag, AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  buscarComandasAbertas,
  buscarClientesParaComanda,
  buscarProdutosParaComanda,
  abrirComanda,
  adicionarItemComanda,
  removerItemComanda,
  fecharComanda,
  cancelarComanda,
  type Comanda,
  type ItemComanda,
} from "./actions"
import { toast } from "sonner"

type Produto = { id: string; nome: string; preco: number; categoria: string; estoque: number }
type Cliente = { id: string; nome: string; telefone: string | null }
type FormaPagamento = "DINHEIRO" | "PIX" | "CARTAO"

const pagInfo: Record<FormaPagamento, { label: string; icon: React.ElementType }> = {
  DINHEIRO: { label: "Dinheiro", icon: Banknote },
  PIX:      { label: "PIX",      icon: Smartphone },
  CARTAO:   { label: "Cartão",   icon: CreditCard },
}

function tempoAberto(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${m}min` : `${h}h`
}

export default function ComandasPage() {
  const [comandas, setComandas]       = useState<Comanda[]>([])
  const [produtos, setProdutos]       = useState<Produto[]>([])
  const [clientes, setClientes]       = useState<Cliente[]>([])
  const [comandaSel, setComandaSel]   = useState<Comanda | null>(null)
  const [isPending, startTransition]  = useTransition()

  const [dialogNova, setDialogNova]         = useState(false)
  const [dialogItem, setDialogItem]         = useState(false)
  const [dialogFechar, setDialogFechar]     = useState(false)
  const [dialogCancelar, setDialogCancelar] = useState(false)
  const [dialogDetalhe, setDialogDetalhe]  = useState(false)

  const [modoNova, setModoNova]   = useState<"buscar" | "novo">("buscar")
  const [buscaCli, setBuscaCli]   = useState("")
  const [formNova, setFormNova]   = useState({ nome: "", telefone: "" })
  const [buscaProd, setBuscaProd] = useState("")
  const [formaPag, setFormaPag]   = useState<FormaPagamento>("DINHEIRO")

  async function recarregar() {
    const lista = await buscarComandasAbertas()
    setComandas(lista)
    if (comandaSel) {
      const atualizada = lista.find((c) => c.id === comandaSel.id) ?? null
      setComandaSel(atualizada)
    }
  }

  useEffect(() => {
    recarregar()
    buscarProdutosParaComanda().then(setProdutos)
    buscarClientesParaComanda().then(setClientes)
  }, [])

  const prodFiltrados = buscaProd
    ? produtos.filter((p) => p.nome.toLowerCase().includes(buscaProd.toLowerCase()))
    : produtos

  function abrirDetalhe(c: Comanda) {
    setComandaSel(c)
    setDialogDetalhe(true)
  }

  function handleAbrirItem() {
    setBuscaProd("")
    setDialogItem(true)
  }

  function handleAbrirFechar() {
    setFormaPag("DINHEIRO")
    setDialogFechar(true)
  }

  function handleAbrirDialogNova() {
    setModoNova("buscar")
    setBuscaCli("")
    setFormNova({ nome: "", telefone: "" })
    setDialogNova(true)
  }

  function handleCriarComanda(dados?: { nome: string; telefone?: string }) {
    const nome = dados?.nome ?? formNova.nome
    const telefone = dados?.telefone ?? formNova.telefone
    if (!nome.trim()) return
    startTransition(async () => {
      await abrirComanda({ clienteNome: nome, clienteTelefone: telefone })
      await recarregar()
      setDialogNova(false)
      setFormNova({ nome: "", telefone: "" })
      setBuscaCli("")
    })
  }

  const clientesFiltrados = buscaCli
    ? clientes.filter(
        (c) =>
          c.nome.toLowerCase().includes(buscaCli.toLowerCase()) ||
          (c.telefone ?? "").includes(buscaCli)
      )
    : clientes

  function handleAdicionarItem(produto: Produto) {
    if (!comandaSel) return
    startTransition(async () => {
      const { alerta } = await adicionarItemComanda({
        comandaId: comandaSel.id,
        produtoId: produto.id,
        produtoNome: produto.nome,
        preco: produto.preco,
        quantidade: 1,
      })
      await recarregar()
      buscarProdutosParaComanda().then(setProdutos)
      setDialogItem(false)
      if (alerta) {
        toast.warning(`⚠️ Estoque baixo: ${alerta.nome}`, {
          description: `Restam apenas ${alerta.estoque} unidade${alerta.estoque !== 1 ? "s" : ""} (mínimo: ${alerta.estoqueMinimo})`,
          duration: 8000,
        })
      }
    })
  }

  function handleRemoverItem(item: ItemComanda) {
    if (!comandaSel) return
    startTransition(async () => {
      await removerItemComanda(item.id, item.produtoId, item.quantidade)
      await recarregar()
      buscarProdutosParaComanda().then(setProdutos)
    })
  }

  function handleFechar() {
    if (!comandaSel) return
    startTransition(async () => {
      await fecharComanda({
        comandaId: comandaSel.id,
        formaPagamento: formaPag,
        clienteNome: comandaSel.clienteNome,
        total: comandaSel.total,
      })
      await recarregar()
      setDialogFechar(false)
      setDialogDetalhe(false)
      setComandaSel(null)
    })
  }

  function handleCancelar() {
    if (!comandaSel) return
    startTransition(async () => {
      await cancelarComanda(comandaSel.id)
      await recarregar()
      setDialogCancelar(false)
      setDialogDetalhe(false)
      setComandaSel(null)
    })
  }

  const totalGeral = comandas.reduce((s, c) => s + c.total, 0)

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Comandas</h1>
          <p className="text-sm text-muted-foreground">
            {comandas.length} comanda{comandas.length !== 1 ? "s" : ""} aberta{comandas.length !== 1 ? "s" : ""}
            {totalGeral > 0 && ` — Total em aberto: R$ ${totalGeral.toFixed(2).replace(".", ",")}`}
          </p>
        </div>
        <Button onClick={handleAbrirDialogNova} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />Nova comanda
        </Button>
      </div>

      {comandas.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <ShoppingBag className="w-10 h-10 opacity-20 mx-auto mb-3" />
          <p className="text-sm">Nenhuma comanda aberta no momento.</p>
          <p className="text-xs mt-1">Clique em "Nova comanda" para abrir uma aba para o cliente.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {comandas.map((c) => (
          <Card
            key={c.id}
            className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer"
            onClick={() => abrirDetalhe(c)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-foreground">{c.clienteNome}</p>
                  {c.clienteTelefone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />{c.clienteTelefone}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />{tempoAberto(c.criadoEm)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {c.itens.length} item{c.itens.length !== 1 ? "s" : ""}
                </span>
                <span className="text-base font-bold text-primary">
                  R$ {c.total.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Dialog: Nova comanda ── */}
      <Dialog open={dialogNova} onOpenChange={setDialogNova}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nova comanda</DialogTitle>
          </DialogHeader>

          {/* Toggle de modo */}
          <div className="flex bg-secondary rounded-lg p-1 gap-1">
            <button
              type="button"
              onClick={() => { setModoNova("buscar"); setBuscaCli("") }}
              className={cn(
                "flex-1 text-xs font-medium py-1.5 rounded-md transition-colors",
                modoNova === "buscar"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Buscar cliente
            </button>
            <button
              type="button"
              onClick={() => { setModoNova("novo"); setFormNova({ nome: "", telefone: "" }) }}
              className={cn(
                "flex-1 text-xs font-medium py-1.5 rounded-md transition-colors",
                modoNova === "novo"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Novo cliente
            </button>
          </div>

          {modoNova === "buscar" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={buscaCli}
                  onChange={(e) => setBuscaCli(e.target.value)}
                  className="pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {clientes.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-6">
                    Nenhum cliente cadastrado ainda.
                  </p>
                )}
                {clientes.length > 0 && clientesFiltrados.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">
                    Nenhum cliente encontrado.
                  </p>
                )}
                {clientesFiltrados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleCriarComanda({ nome: c.nome, telefone: c.telefone ?? undefined })}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/60 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                      {c.telefone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />{c.telefone}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <Button variant="outline" className="w-full border-border" onClick={() => setDialogNova(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nome do cliente *</Label>
                <Input
                  placeholder="Ex: João Silva"
                  value={formNova.nome}
                  onChange={(e) => setFormNova((f) => ({ ...f, nome: e.target.value }))}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  onKeyDown={(e) => e.key === "Enter" && handleCriarComanda()}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Telefone (opcional)</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={formNova.telefone}
                  onChange={(e) => setFormNova((f) => ({ ...f, telefone: e.target.value }))}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogNova(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={() => handleCriarComanda()} disabled={!formNova.nome.trim() || isPending}>
                  {isPending ? "Abrindo..." : "Abrir comanda"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Detalhe da comanda ── */}
      <Dialog open={dialogDetalhe && !dialogItem && !dialogFechar && !dialogCancelar} onOpenChange={(o) => { if (!o) { setDialogDetalhe(false); setComandaSel(null) } }}>
        {comandaSel && (
          <DialogContent className="bg-card border-border sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                <div className="flex items-center justify-between pr-6">
                  <div>
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      {comandaSel.clienteNome}
                    </span>
                    {comandaSel.clienteTelefone && (
                      <p className="text-xs text-muted-foreground font-normal mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3" />{comandaSel.clienteTelefone}
                      </p>
                    )}
                  </div>
                  <span className="text-primary text-lg font-bold">
                    R$ {comandaSel.total.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {comandaSel.itens.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum item ainda. Adicione produtos abaixo.
                </p>
              )}
              {comandaSel.itens.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.produtoNome}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantidade}x · R$ {item.preco.toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">
                    R$ {(item.preco * item.quantidade).toFixed(2).replace(".", ",")}
                  </span>
                  <button
                    onClick={() => handleRemoverItem(item)}
                    disabled={isPending}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <Button variant="outline" className="w-full border-border gap-2" onClick={handleAbrirItem}>
                <Plus className="w-4 h-4" />Adicionar item
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDialogCancelar(true)}
                >
                  Cancelar comanda
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                  disabled={comandaSel.itens.length === 0}
                  onClick={handleAbrirFechar}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Fechar · R$ {comandaSel.total.toFixed(2).replace(".", ",")}
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Dialog: Adicionar item ── */}
      <Dialog open={dialogItem} onOpenChange={(o) => { if (!o) setDialogItem(false) }}>
        <DialogContent className="bg-card border-border sm:max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Adicionar item — {comandaSel?.clienteNome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={buscaProd}
                onChange={(e) => setBuscaProd(e.target.value)}
                className="pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {prodFiltrados.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">
                  Nenhum produto disponível.
                </p>
              )}
              {prodFiltrados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAdicionarItem(p)}
                  disabled={isPending || p.estoque <= 0}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 transition-colors text-left",
                    p.estoque <= 0
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-secondary/60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{p.nome}</span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full font-medium",
                      p.estoque <= 0 ? "bg-red-500/10 text-red-500" :
                      p.estoque <= 5 ? "bg-yellow-500/10 text-yellow-600" :
                      "bg-green-500/10 text-green-600"
                    )}>
                      {p.estoque} un.
                    </span>
                  </div>
                  <span className="text-sm text-primary font-semibold shrink-0">
                    R$ {p.preco.toFixed(2).replace(".", ",")}
                  </span>
                </button>
              ))}
            </div>
            <Button variant="outline" className="w-full border-border" onClick={() => setDialogItem(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Fechar comanda ── */}
      <Dialog open={dialogFechar} onOpenChange={(o) => { if (!o) setDialogFechar(false) }}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Fechar comanda — {comandaSel?.clienteNome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="bg-secondary/50 rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground">Total a receber</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">
                R$ {comandaSel?.total.toFixed(2).replace(".", ",")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Forma de pagamento</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(pagInfo) as [FormaPagamento, typeof pagInfo[FormaPagamento]][]).map(([key, info]) => {
                  const Icon = info.icon
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormaPag(key)}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-all",
                        formaPag === key
                          ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />{info.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogFechar(false)} disabled={isPending}>
                Voltar
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2" onClick={handleFechar} disabled={isPending}>
                <CheckCircle2 className="w-4 h-4" />
                {isPending ? "Fechando..." : "Confirmar pagamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Cancelar comanda ── */}
      <Dialog open={dialogCancelar} onOpenChange={(o) => { if (!o) setDialogCancelar(false) }}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Cancelar comanda?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
              O estoque dos itens será restaurado e a comanda será encerrada sem cobrança.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogCancelar(false)}>
                Voltar
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleCancelar} disabled={isPending}>
                {isPending ? "Cancelando..." : "Cancelar comanda"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
