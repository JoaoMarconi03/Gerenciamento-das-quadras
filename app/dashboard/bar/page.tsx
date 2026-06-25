"use client"

import { useState, useEffect } from "react"
import { Plus, Minus, Pencil, Package, ShoppingBag, Banknote, CreditCard, Smartphone, Trash2 } from "lucide-react"
import { buscarProdutos, criarProduto, atualizarProduto, buscarVendas, criarVenda, atualizarVenda, excluirVenda } from "./actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

// ─── tipos ──────────────────────────────────────────────────────────────────

type Produto = {
  id: string
  nome: string
  preco: number
  categoria: "BEBIDA" | "ALIMENTO" | "OUTRO"
  ativo: boolean
}

type ItemVenda = {
  produtoId: string
  nome: string
  preco: number
  quantidade: number
}

type FormaPagamento = "DINHEIRO" | "PIX" | "CARTAO"

type Venda = {
  id: string
  cliente: string
  itens: ItemVenda[]
  total: number
  formaPagamento: FormaPagamento
  hora: string
}


// ─── helpers ─────────────────────────────────────────────────────────────────

const categoriaBadge: Record<string, string> = {
  BEBIDA:   "text-blue-400 border-blue-400/30",
  ALIMENTO: "text-orange-400 border-orange-400/30",
  OUTRO:    "text-muted-foreground border-border",
}

const categoriaLabel: Record<string, string> = {
  BEBIDA: "Bebida", ALIMENTO: "Alimento", OUTRO: "Outro",
}

const pagamentoInfo: Record<FormaPagamento, { label: string; icon: React.ElementType; cor: string }> = {
  DINHEIRO: { label: "Dinheiro",   icon: Banknote,    cor: "text-green-400 bg-green-400/10"  },
  PIX:      { label: "PIX",        icon: Smartphone,  cor: "text-sky-400 bg-sky-400/10"      },
  CARTAO:   { label: "Cartão/Máq", icon: CreditCard,  cor: "text-purple-400 bg-purple-400/10" },
}

function fmtHora(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
}

// ─── componente ──────────────────────────────────────────────────────────────

export default function BarPage() {
  // produtos
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [dialogProduto, setDialogProduto] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [formProd, setFormProd] = useState({ nome: "", preco: "", categoria: "BEBIDA" as Produto["categoria"] })
  const [salvandoProduto, setSalvandoProduto] = useState(false)

  useEffect(() => {
    buscarProdutos().then(setProdutos)
    buscarVendas().then(setVendas)
  }, [])

  // vendas
  const [vendas, setVendas] = useState<Venda[]>([])
  const [dialogVenda, setDialogVenda] = useState(false)
  const [editandoVenda, setEditandoVenda] = useState<Venda | null>(null)
  const [formVenda, setFormVenda] = useState({
    cliente: "",
    formaPagamento: "DINHEIRO" as FormaPagamento,
  })
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([])
  const [confirmarExclusao, setConfirmarExclusao] = useState<Venda | null>(null)

  const totalVenda = itensVenda.reduce((s, i) => s + i.preco * i.quantidade, 0)
  const faturamentoDia = vendas.reduce((s, v) => s + v.total, 0)

  // ── handlers produtos ──

  function abrirNovoProduto() {
    setEditando(null)
    setFormProd({ nome: "", preco: "", categoria: "BEBIDA" })
    setDialogProduto(true)
  }

  function abrirEditarProduto(p: Produto) {
    setEditando(p)
    setFormProd({ nome: p.nome, preco: String(p.preco), categoria: p.categoria })
    setDialogProduto(true)
  }

  async function salvarProduto() {
    if (!formProd.nome || !formProd.preco) return
    setSalvandoProduto(true)
    const preco = parseFloat(formProd.preco)
    if (editando) {
      await atualizarProduto(editando.id, { nome: formProd.nome, preco, categoria: formProd.categoria })
      setProdutos((prev) => prev.map((p) => p.id === editando.id
        ? { ...p, nome: formProd.nome, preco, categoria: formProd.categoria }
        : p))
    } else {
      await criarProduto({ nome: formProd.nome, preco, categoria: formProd.categoria })
      const lista = await buscarProdutos()
      setProdutos(lista)
    }
    setSalvandoProduto(false)
    setDialogProduto(false)
  }

  // ── handlers vendas ──

  function abrirNovaVenda() {
    setEditandoVenda(null)
    setFormVenda({ cliente: "", formaPagamento: "DINHEIRO" })
    setItensVenda([])
    setDialogVenda(true)
  }

  function abrirEditarVenda(v: Venda) {
    setEditandoVenda(v)
    setFormVenda({ cliente: v.cliente, formaPagamento: v.formaPagamento })
    setItensVenda(v.itens.map((i) => ({ ...i })))
    setDialogVenda(true)
  }

  async function handleExcluirVenda(id: string) {
    await excluirVenda(id)
    setVendas((prev) => prev.filter((v) => v.id !== id))
    setConfirmarExclusao(null)
  }

  function selecionarProduto(produtoId: string) {
    const prod = produtos.find((p) => p.id === produtoId)
    if (!prod) return
    setItensVenda((prev) => {
      const existe = prev.find((i) => i.produtoId === prod.id)
      if (existe) return prev.map((i) => i.produtoId === prod.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      return [...prev, { produtoId: prod.id, nome: prod.nome, preco: prod.preco, quantidade: 1 }]
    })
  }

  function ajustarQuantidade(produtoId: string, delta: number) {
    setItensVenda((prev) =>
      prev.flatMap((i) => {
        if (i.produtoId !== produtoId) return [i]
        const nova = i.quantidade + delta
        return nova <= 0 ? [] : [{ ...i, quantidade: nova }]
      })
    )
  }

  function removerItem(produtoId: string) {
    setItensVenda((prev) => prev.filter((i) => i.produtoId !== produtoId))
  }

  async function confirmarVenda() {
    if (itensVenda.length === 0) return
    const payload = {
      cliente: formVenda.cliente.trim(),
      formaPagamento: formVenda.formaPagamento,
      total: totalVenda,
      itens: itensVenda,
    }
    if (editandoVenda) {
      await atualizarVenda(editandoVenda.id, payload)
    } else {
      await criarVenda(payload)
    }
    const lista = await buscarVendas()
    setVendas(lista)
    setDialogVenda(false)
  }

  const grupos = ["BEBIDA", "ALIMENTO", "OUTRO"] as const

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <h1 className="text-xl font-bold text-foreground">Bar</h1>

      <Tabs defaultValue="vendas">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="vendas" className="flex-1 sm:flex-none gap-2">
            <ShoppingBag className="w-4 h-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="produtos" className="flex-1 sm:flex-none gap-2">
            <Package className="w-4 h-4" />
            Produtos
          </TabsTrigger>
        </TabsList>

        {/* ── ABA VENDAS ── */}
        <TabsContent value="vendas" className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Faturamento hoje:{" "}
                <span className="text-primary font-semibold">
                  R$ {faturamentoDia.toFixed(2).replace(".", ",")}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{vendas.length} venda{vendas.length !== 1 ? "s" : ""} registrada{vendas.length !== 1 ? "s" : ""}</p>
            </div>
            <Button onClick={abrirNovaVenda} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova venda
            </Button>
          </div>

          <div className="space-y-2">
            {vendas.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Nenhuma venda registrada ainda.
              </div>
            )}
            {vendas.map((v) => {
              const pg = pagamentoInfo[v.formaPagamento]
              const PgIcon = pg.icon
              return (
                <Card key={v.id} className="bg-card border-border">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-foreground">
                          {v.cliente || "Cliente não identificado"}
                        </p>
                        <span className="text-xs text-muted-foreground">{fmtHora(v.hora)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {v.itens.map((i) => `${i.nome}${i.quantidade > 1 ? ` x${i.quantidade}` : ""}`).join(" · ")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-base font-bold text-primary">
                        R$ {v.total.toFixed(2).replace(".", ",")}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${pg.cor}`}>
                        <PgIcon className="w-3 h-3" />
                        {pg.label}
                      </span>
                      <div className="flex gap-1 mt-0.5">
                        <button
                          onClick={() => abrirEditarVenda(v)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="Editar venda"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmarExclusao(v)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Excluir venda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ── ABA PRODUTOS ── */}
        <TabsContent value="produtos" className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {produtos.filter((p) => p.ativo).length} produtos ativos
            </p>
            <Button onClick={abrirNovoProduto} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo produto
            </Button>
          </div>

          {grupos.map((cat) => {
            const lista = produtos.filter((p) => p.categoria === cat)
            if (lista.length === 0) return null
            return (
              <div key={cat}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {categoriaLabel[cat]}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {lista.map((p) => (
                    <Card key={p.id} className="bg-card border-border">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.nome}</p>
                          <p className="text-lg font-bold text-primary">R$ {p.preco.toFixed(2)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirEditarProduto(p)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Confirmar exclusão ── */}
      <Dialog open={!!confirmarExclusao} onOpenChange={(o) => !o && setConfirmarExclusao(null)}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Excluir venda?</DialogTitle>
          </DialogHeader>
          {confirmarExclusao && (
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                Venda de{" "}
                <span className="text-foreground font-medium">
                  {confirmarExclusao.cliente || "cliente não identificado"}
                </span>{" "}
                no valor de{" "}
                <span className="text-primary font-semibold">
                  R$ {confirmarExclusao.total.toFixed(2).replace(".", ",")}
                </span>{" "}
                ({confirmarExclusao.hora}). Essa ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-border" onClick={() => setConfirmarExclusao(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleExcluirVenda(confirmarExclusao.id)}
                >
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Nova / Editar Venda ── */}
      <Dialog open={dialogVenda} onOpenChange={setDialogVenda}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editandoVenda ? "Editar Venda" : "Registrar Venda"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Cliente + Pagamento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cliente (opcional)</Label>
                <Input
                  placeholder="Nome"
                  value={formVenda.cliente}
                  onChange={(e) => setFormVenda((f) => ({ ...f, cliente: e.target.value }))}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Forma de pagamento</Label>
                <Select
                  value={formVenda.formaPagamento}
                  onValueChange={(v) => setFormVenda((f) => ({ ...f, formaPagamento: v as FormaPagamento }))}
                >
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="DINHEIRO" className="text-foreground">💵 Dinheiro</SelectItem>
                    <SelectItem value="PIX"      className="text-foreground">📱 PIX</SelectItem>
                    <SelectItem value="CARTAO"   className="text-foreground">💳 Cartão / Máquina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selecionar produto — adiciona direto ao clicar */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Adicionar produto</Label>
              <Select value="" onValueChange={selecionarProduto}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Toque para adicionar um produto…" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {produtos.filter((p) => p.ativo).map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-foreground">
                      {p.nome} — R$ {p.preco.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lista de itens com controles de quantidade */}
            {itensVenda.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {itensVenda.map((item) => (
                    <div key={item.produtoId} className="flex items-center gap-3 px-3 py-2.5 bg-secondary/40">
                      <span className="text-sm text-foreground font-medium flex-1 min-w-0 truncate">
                        {item.nome}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => ajustarQuantidade(item.produtoId, -1)}
                          className="w-6 h-6 rounded-md bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-semibold text-foreground w-5 text-center">
                          {item.quantidade}
                        </span>
                        <button
                          onClick={() => ajustarQuantidade(item.produtoId, 1)}
                          className="w-6 h-6 rounded-md bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-primary shrink-0 w-20 text-right">
                        R$ {(item.preco * item.quantidade).toFixed(2).replace(".", ",")}
                      </span>
                      <button
                        onClick={() => removerItem(item.produtoId)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 bg-primary/5 border-t border-border">
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <span className="text-lg font-bold text-primary">
                    R$ {totalVenda.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>
            )}

            {itensVenda.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-2">
                Selecione um produto acima para adicionar.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={() => setDialogVenda(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={itensVenda.length === 0}
                onClick={confirmarVenda}
              >
                {editandoVenda ? "Salvar" : "Confirmar"} — R$ {totalVenda.toFixed(2).replace(".", ",")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Produto ── */}
      <Dialog open={dialogProduto} onOpenChange={setDialogProduto}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editando ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome do produto</Label>
              <Input
                placeholder="Ex: Cerveja 600ml"
                value={formProd.nome}
                onChange={(e) => setFormProd((f) => ({ ...f, nome: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.50"
                  placeholder="0,00"
                  value={formProd.preco}
                  onChange={(e) => setFormProd((f) => ({ ...f, preco: e.target.value }))}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <Select
                  value={formProd.categoria}
                  onValueChange={(v) => setFormProd((f) => ({ ...f, categoria: v as Produto["categoria"] }))}
                >
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="BEBIDA"   className="text-foreground">Bebida</SelectItem>
                    <SelectItem value="ALIMENTO" className="text-foreground">Alimento</SelectItem>
                    <SelectItem value="OUTRO"    className="text-foreground">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogProduto(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={salvarProduto} disabled={!formProd.nome || !formProd.preco || salvandoProduto}>
                {salvandoProduto ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
