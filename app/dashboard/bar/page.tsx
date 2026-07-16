"use client"

import { useState, useEffect, useTransition } from "react"
import {
  Plus, Minus, Pencil, Package, ShoppingBag, Banknote, CreditCard,
  Smartphone, Trash2, Search, X, BookOpen, UserPlus, CheckCircle2,
  ShoppingCart, ChevronRight,
} from "lucide-react"
import {
  buscarProdutos, criarProduto, atualizarProduto, excluirProduto,
  buscarVendas, criarVenda, atualizarVenda, excluirVenda,
  buscarContasFiado, criarVendaFiado, criarClienteEContaFiado, buscarTotalMes,
} from "./actions"
import { toast } from "sonner"
import {
  buscarContas, criarConta, lancarItem, registrarPagamento, buscarClientesParaFiado, excluirLancamento,
} from "../fiado/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ─── tipos ───────────────────────────────────────────────────────────────────

type Produto      = { id: string; nome: string; preco: number; categoria: "BEBIDA" | "ALIMENTO" | "OUTRO"; ativo: boolean; estoque: number; estoqueMinimo: number }
type ItemVenda    = { produtoId: string; nome: string; preco: number; quantidade: number }
type FormaPagamento = "DINHEIRO" | "PIX" | "CARTAO"
type ModoPag      = FormaPagamento | "FIADO"
type Venda        = { id: string; cliente: string; itens: ItemVenda[]; total: number; formaPagamento: FormaPagamento; hora: string }
type ContaBar     = { id: string; clienteNome: string; saldo: number }

type Lancamento   = { id: string; descricao: string; valor: number; data: string }
type Conta        = { id: string; clienteNome: string; clienteTelefone: string; diaFechamento: number; saldo: number; lancamentos: Lancamento[] }
type ClienteFiado = { id: string; nome: string; telefone: string | null; temConta: boolean }
type ProdFiado    = { id: string; nome: string; preco: number }

// ─── helpers ─────────────────────────────────────────────────────────────────

const categoriaLabel: Record<string, string> = { BEBIDA: "Bebida", ALIMENTO: "Alimento", OUTRO: "Outro" }

const pagamentoInfo: Record<FormaPagamento, { label: string; icon: React.ElementType; cor: string }> = {
  DINHEIRO: { label: "Dinheiro",   icon: Banknote,   cor: "text-green-400 bg-green-400/10"   },
  PIX:      { label: "PIX",        icon: Smartphone, cor: "text-sky-400 bg-sky-400/10"        },
  CARTAO:   { label: "Cartão/Máq", icon: CreditCard, cor: "text-purple-400 bg-purple-400/10" },
}

const modosPagamento: { value: ModoPag; label: string; icon: React.ElementType }[] = [
  { value: "DINHEIRO", label: "Dinheiro", icon: Banknote   },
  { value: "PIX",      label: "PIX",      icon: Smartphone },
  { value: "CARTAO",   label: "Cartão",   icon: CreditCard },
  { value: "FIADO",    label: "Fiado",    icon: BookOpen   },
]

function fmtHora(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
}

// ─── componente ──────────────────────────────────────────────────────────────

export default function BarPage() {
  // ── tab ──
  const [abaAtiva, setAbaAtiva] = useState("vendas")

  // ── produtos ──
  const [produtos, setProdutos]           = useState<Produto[]>([])
  const [dialogProduto, setDialogProduto] = useState(false)
  const [editando, setEditando]           = useState<Produto | null>(null)
  const [formProd, setFormProd]           = useState({ nome: "", preco: "", categoria: "BEBIDA" as Produto["categoria"], estoque: "0", estoqueMinimo: "5" })
  const [salvandoProduto, setSalvando]    = useState(false)

  // ── vendas ──
  const [vendas, setVendas]               = useState<Venda[]>([])
  const [dialogVenda, setDialogVenda]     = useState(false)
  const [editandoVenda, setEditandoVenda] = useState<Venda | null>(null)
  const [itensVenda, setItensVenda]       = useState<ItemVenda[]>([])
  const [modoPag, setModoPag]             = useState<ModoPag>("DINHEIRO")
  const [clienteTexto, setClienteTexto]   = useState("")
  const [erroVenda, setErroVenda]         = useState<string | null>(null)
  const [isPending, startTransition]      = useTransition()

  // ── venda fiado ──
  const [contasBar, setContasBar]         = useState<ContaBar[]>([])
  const [contaBarSel, setContaBarSel]     = useState<ContaBar | null>(null)
  const [buscaClienteBar, setBuscaCliBar] = useState("")
  const [modoNovoCliBar, setModoNovoCli]  = useState(false)
  const [novoNomeBar, setNovoNomeBar]     = useState("")
  const [novoTelBar, setNovoTelBar]       = useState("")
  const [buscaProduto, setBuscaProduto]   = useState("")

  // ── exclusões ──
  const [confirmarExcVenda, setConfExcVenda]     = useState<Venda | null>(null)
  const [confirmarExcProduto, setConfExcProduto] = useState<Produto | null>(null)

  // ── aba fiado (gestão) ──
  const [contas, setContas]                   = useState<Conta[]>([])
  const [prodsFiado, setProdsFiado]           = useState<ProdFiado[]>([])
  const [contaSel, setContaSel]               = useState<Conta | null>(null)
  const [dialogNovaConta, setDialogNovaConta] = useState(false)
  const [dialogLancamento, setDialogLancamento] = useState(false)
  const [dialogPagamento, setDialogPagamento] = useState(false)
  const [modoNovaConta, setModoNovaConta]     = useState<"existente" | "novo">("existente")
  const [clientesFiado, setClientesFiado]     = useState<ClienteFiado[]>([])
  const [buscaCliFiado, setBuscaCliFiado]     = useState("")
  const [clienteSelFiado, setClienteSelFiado] = useState<ClienteFiado | null>(null)
  const [erroNovaConta, setErroNovaConta]     = useState("")
  const [formNova, setFormNova]               = useState({ nome: "", telefone: "", diaFechamento: "30" })
  const [buscaProdFiado, setBuscaProdFiado]   = useState("")
  const [produtoSelFiado, setProdutoSelFiado] = useState<ProdFiado | null>(null)
  const [qtdFiado, setQtdFiado]               = useState("1")
  const [formPag, setFormPag]                 = useState({ valor: "", observacao: "", formaPagamento: "DINHEIRO" as "DINHEIRO" | "PIX" | "CARTAO" })
  const [totalMes, setTotalMes]               = useState(0)

  const totalVenda     = itensVenda.reduce((s, i) => s + i.preco * i.quantidade, 0)
  const faturamentoDia = vendas.reduce((s, v) => s + v.total, 0)
  const totalPendente  = contas.reduce((s, c) => s + c.saldo, 0)
  const qtd            = Math.max(1, parseInt(qtdFiado) || 1)
  const valorPreview   = produtoSelFiado ? produtoSelFiado.preco * qtd : 0

  const produtosFiltrados = buscaProduto
    ? produtos.filter((p) => p.nome.toLowerCase().includes(buscaProduto.toLowerCase()))
    : []

  async function recarregarContas() {
    const lista = await buscarContas()
    setContas(lista)
  }

  useEffect(() => {
    buscarProdutos().then(setProdutos)
    buscarVendas().then(setVendas)
    buscarTotalMes().then(setTotalMes)
    recarregarContas()
    buscarProdutos().then((p) => setProdsFiado(p.map((x) => ({ id: x.id, nome: x.nome, preco: x.preco }))))
  }, [])

  // ── handlers produtos ─────────────────────────────────────────────────────

  function abrirNovoProduto() {
    setEditando(null)
    setFormProd({ nome: "", preco: "", categoria: "BEBIDA", estoque: "0", estoqueMinimo: "5" })
    setDialogProduto(true)
  }

  function abrirEditarProduto(p: Produto) {
    setEditando(p)
    setFormProd({ nome: p.nome, preco: String(p.preco), categoria: p.categoria, estoque: String(p.estoque), estoqueMinimo: String(p.estoqueMinimo) })
    setDialogProduto(true)
  }

  async function salvarProduto() {
    if (!formProd.nome || !formProd.preco) return
    setSalvando(true)
    const preco = parseFloat(formProd.preco)
    const estoque = parseInt(formProd.estoque) || 0
    const estoqueMinimo = parseInt(formProd.estoqueMinimo) || 5
    if (editando) {
      await atualizarProduto(editando.id, { nome: formProd.nome, preco, categoria: formProd.categoria, estoque, estoqueMinimo })
    }else {
      await criarProduto({ nome: formProd.nome, preco, categoria: formProd.categoria, estoque, estoqueMinimo })
    }
    buscarProdutos().then(setProdutos)
    setSalvando(false)
    setDialogProduto(false)
  }

  // ── handlers vendas ───────────────────────────────────────────────────────

  function resetDialogVenda() {
    setItensVenda([]); setModoPag("DINHEIRO"); setClienteTexto("")
    setErroVenda(null); setBuscaProduto(""); setContaBarSel(null)
    setBuscaCliBar(""); setModoNovoCli(false); setNovoNomeBar(""); setNovoTelBar("")
  }

  function abrirNovaVenda() {
    setEditandoVenda(null)
    resetDialogVenda()
    buscarContasFiado().then(setContasBar)
    setDialogVenda(true)
  }

  function abrirEditarVenda(v: Venda) {
    setEditandoVenda(v)
    resetDialogVenda()
    setClienteTexto(v.cliente)
    setModoPag(v.formaPagamento)
    setItensVenda(v.itens.map((i) => ({ ...i })))
    setDialogVenda(true)
  }

  function selecionarProduto(produtoId: string) {
    const prod = produtos.find((p) => p.id === produtoId)
    if (!prod) return
    setItensVenda((prev) => {
      const existe = prev.find((i) => i.produtoId === prod.id)
      if (existe) return prev.map((i) => i.produtoId === prod.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      return [...prev, { produtoId: prod.id, nome: prod.nome, preco: prod.preco, quantidade: 1 }]
    })
    setBuscaProduto("")
  }

  function ajustarQtd(produtoId: string, delta: number) {
    setItensVenda((prev) =>
      prev.flatMap((i) => {
        if (i.produtoId !== produtoId) return [i]
        const nova = i.quantidade + delta
        return nova <= 0 ? [] : [{ ...i, quantidade: nova }]
      })
    )
  }

  function confirmarVenda() {
    if (itensVenda.length === 0) return
    setErroVenda(null)
    startTransition(async () => {
      try {
        if (modoPag === "FIADO") {
          let contaId = contaBarSel?.id
          if (modoNovoCliBar) {
            if (!novoNomeBar.trim()) { setErroVenda("Nome é obrigatório."); return }
            const res = await criarClienteEContaFiado({ nome: novoNomeBar, telefone: novoTelBar })
            if (!res.ok) { setErroVenda(res.erro ?? "Erro ao criar cliente."); return }
            contaId = res.contaId
            buscarContasFiado().then(setContasBar)
            recarregarContas()
          }
          if (!contaId) { setErroVenda("Selecione um cliente para o fiado."); return }
          const { alertas: alertasFiado } = await criarVendaFiado({ contaId, itens: itensVenda })
          recarregarContas()
          alertasFiado.forEach((a) =>
            toast.warning(`⚠️ Estoque baixo: ${a.nome}`, {
              description: `Restam apenas ${a.estoque} unidade${a.estoque !== 1 ? "s" : ""} (mínimo: ${a.estoqueMinimo})`,
              duration: 8000,
            })
          )
        } else {
          const payload = { cliente: clienteTexto.trim(), formaPagamento: modoPag as FormaPagamento, total: totalVenda, itens: itensVenda }
          if (editandoVenda) { await atualizarVenda(editandoVenda.id, payload) }
          else {
            const { alertas } = await criarVenda(payload)
            buscarVendas().then(setVendas)
            buscarTotalMes().then(setTotalMes)
            alertas.forEach((a) =>
              toast.warning(`⚠️ Estoque baixo: ${a.nome}`, {
                description: `Restam apenas ${a.estoque} unidade${a.estoque !== 1 ? "s" : ""} (mínimo: ${a.estoqueMinimo})`,
                duration: 8000,
              })
            )
          }
          if (editandoVenda) { buscarVendas().then(setVendas); buscarTotalMes().then(setTotalMes) }
        }
        setDialogVenda(false)
      } catch (e: any) {
        setErroVenda(`Erro: ${e?.message ?? String(e)}`)
      }
    })
  }

  // ── handlers fiado (gestão) ───────────────────────────────────────────────

  function abrirDialogNovaConta() {
    setModoNovaConta("existente"); setBuscaCliFiado(""); setClienteSelFiado(null)
    setErroNovaConta(""); setFormNova({ nome: "", telefone: "", diaFechamento: "30" })
    buscarClientesParaFiado().then(setClientesFiado)
    setDialogNovaConta(true)
  }

  function handleNovaConta() {
    setErroNovaConta("")
    const diaFechamento = Number(formNova.diaFechamento) || 30
    if (modoNovaConta === "existente" && !clienteSelFiado) { setErroNovaConta("Selecione um cliente."); return }
    if (modoNovaConta === "novo" && !formNova.nome.trim()) { setErroNovaConta("Nome é obrigatório."); return }
    startTransition(async () => {
      const res = await criarConta(
        modoNovaConta === "existente"
          ? { clienteId: clienteSelFiado!.id, diaFechamento }
          : { nome: formNova.nome.trim(), telefone: formNova.telefone.trim(), diaFechamento }
      )
      if (!res.ok) { setErroNovaConta(res.erro ?? "Erro ao abrir conta."); return }
      await recarregarContas()
      setDialogNovaConta(false)
    })
  }

  function handleLancamento() {
    if (!contaSel || !produtoSelFiado) return
    startTransition(async () => {
      await lancarItem({ contaId: contaSel.id, produtoId: produtoSelFiado.id, quantidade: qtd })
      await recarregarContas()
      const lista = await buscarContas()
      setContaSel(lista.find((c) => c.id === contaSel.id) ?? null)
      setProdutoSelFiado(null); setBuscaProdFiado(""); setQtdFiado("1")
      setDialogLancamento(false)
    })
  }

  function handlePagamento() {
    if (!contaSel) return
    const valor = parseFloat(formPag.valor)
    if (isNaN(valor) || valor <= 0) return
    startTransition(async () => {
      await registrarPagamento({
        contaId: contaSel.id,
        valor,
        observacao: formPag.observacao.trim() || null,
        formaPagamento: formPag.formaPagamento,
      })
      await recarregarContas()
      const [novasVendas, novoTotalMes] = await Promise.all([buscarVendas(), buscarTotalMes()])
      setVendas(novasVendas)
      setTotalMes(novoTotalMes)
      setContaSel(null)
      setFormPag({ valor: "", observacao: "", formaPagamento: "DINHEIRO" })
      setDialogPagamento(false)
      setAbaAtiva("vendas")
    })
  }

  const grupos = ["BEBIDA", "ALIMENTO", "OUTRO"] as const

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <h1 className="text-xl font-bold text-foreground">Bar</h1>

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="vendas" className="flex-1 sm:flex-none gap-2">
            <ShoppingBag className="w-4 h-4" />Vendas
          </TabsTrigger>
          <TabsTrigger value="fiado" className="flex-1 sm:flex-none gap-2">
            <BookOpen className="w-4 h-4" />Fiado
          </TabsTrigger>
          <TabsTrigger value="produtos" className="flex-1 sm:flex-none gap-2">
            <Package className="w-4 h-4" />Produtos
          </TabsTrigger>
        </TabsList>

        {/* ── ABA VENDAS ─────────────────────────────────────────────────── */}
        <TabsContent value="vendas" className="mt-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
              <p className="text-sm text-muted-foreground">
                Hoje:{" "}
                <span className="text-primary font-semibold">R$ {faturamentoDia.toFixed(2).replace(".", ",")}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Este mês:{" "}
                <span className="text-primary font-semibold">R$ {totalMes.toFixed(2).replace(".", ",")}</span>
              </p>
              <p className="text-xs text-muted-foreground col-span-2">
                {vendas.length} venda{vendas.length !== 1 ? "s" : ""} registrada{vendas.length !== 1 ? "s" : ""} hoje
              </p>
            </div>
            <Button onClick={abrirNovaVenda} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />Nova venda
            </Button>
          </div>

          <div className="space-y-2">
            {vendas.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">Nenhuma venda registrada ainda.</div>
            )}
            {vendas.map((v) => {
              const isFiado = v.cliente.startsWith("[Fiado] ")
              const nomeCliente = isFiado ? v.cliente.slice(8) : (v.cliente || "Cliente não identificado")
              const pg = pagamentoInfo[v.formaPagamento]
              const PgIcon = pg.icon
              return (
                <Card key={v.id} className="bg-card border-border">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-sm text-foreground">{nomeCliente}</p>
                        {isFiado && (
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 font-medium">
                            <BookOpen className="w-3 h-3" />Pagamento Fiado
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{fmtHora(v.hora)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {v.itens.length > 0
                          ? v.itens.map((i) => `${i.nome}${i.quantidade > 1 ? ` x${i.quantidade}` : ""}`).join(" · ")
                          : isFiado ? "Quitação de conta fiado" : "—"
                        }
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-base font-bold text-primary">R$ {v.total.toFixed(2).replace(".", ",")}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${pg.cor}`}>
                        <PgIcon className="w-3 h-3" />{pg.label}
                      </span>
                      <div className="flex gap-1 mt-0.5">
                        {!isFiado && (
                          <button onClick={() => abrirEditarVenda(v)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => setConfExcVenda(v)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
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

        {/* ── ABA FIADO ──────────────────────────────────────────────────── */}
        <TabsContent value="fiado" className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total pendente:{" "}
                <span className="text-yellow-600 font-semibold">R$ {totalPendente.toFixed(2).replace(".", ",")}</span>
              </p>
              <p className="text-xs text-muted-foreground">{contas.length} conta{contas.length !== 1 ? "s" : ""} cadastrada{contas.length !== 1 ? "s" : ""}</p>
            </div>
            <Button size="sm" onClick={abrirDialogNovaConta} className="gap-2">
              <UserPlus className="w-4 h-4" />Nova conta
            </Button>
          </div>

          <div className="space-y-2">
            {contas.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma conta de fiado cadastrada.</div>
            )}
            {contas.map((c) => (
              <Card key={c.id} onClick={() => setContaSel(c)}
                className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm">{c.clienteNome.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{c.clienteNome}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.clienteTelefone || "Sem telefone"} · {c.lancamentos.length} lançamento{c.lancamentos.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.saldo === 0 ? (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />Quitado
                      </span>
                    ) : (
                      <span className="text-base font-bold text-yellow-600">R$ {c.saldo.toFixed(2).replace(".", ",")}</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── ABA PRODUTOS ───────────────────────────────────────────────── */}
        <TabsContent value="produtos" className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{produtos.filter((p) => p.ativo).length} produtos ativos</p>
            <Button onClick={abrirNovoProduto} className="gap-2">
              <Plus className="w-4 h-4" />Novo produto
            </Button>
          </div>

          {grupos.map((cat) => {
            const lista = produtos.filter((p) => p.categoria === cat)
            if (lista.length === 0) return null
            return (
              <div key={cat}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{categoriaLabel[cat]}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {lista.map((p) => (
                    <Card key={p.id} className="bg-card border-border">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.nome}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-base font-bold text-primary">R$ {p.preco.toFixed(2)}</p>
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded-full font-medium",
                              p.estoque <= 0 ? "bg-red-500/10 text-red-500" :
                              p.estoque <= p.estoqueMinimo ? "bg-yellow-500/10 text-yellow-600" :
                              "bg-green-500/10 text-green-600"
                            )}>
                              {p.estoque} un.
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => abrirEditarProduto(p)} className="text-muted-foreground hover:text-foreground">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setConfExcProduto(p)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </TabsContent>
      </Tabs>

      {/* ══════════ DIALOGS VENDAS ══════════ */}

      {/* Nova / Editar Venda */}
      <Dialog open={dialogVenda} onOpenChange={setDialogVenda}>
        <DialogContent className="bg-card border-border sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editandoVenda ? "Editar Venda" : "Registrar Venda"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* Pagamento */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Forma de pagamento</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {modosPagamento.map(({ value, label, icon: Icon }) => (
                  <button key={value} type="button"
                    disabled={!!editandoVenda && value === "FIADO"}
                    onClick={() => setModoPag(value)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-all",
                      modoPag === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      !!editandoVenda && value === "FIADO" && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cliente (pago) */}
            {modoPag !== "FIADO" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cliente (opcional)</Label>
                <Input placeholder="Nome do cliente" value={clienteTexto} onChange={(e) => setClienteTexto(e.target.value)}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
            )}

            {/* Cliente (fiado) */}
            {modoPag === "FIADO" && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cliente no fiado</Label>
                <div className="flex gap-1 p-0.5 bg-secondary rounded-lg">
                  {["cadastrado", "novo"].map((m) => (
                    <button key={m} type="button"
                      onClick={() => { setModoNovoCli(m === "novo"); setContaBarSel(null); setBuscaCliBar("") }}
                      className={cn("flex-1 text-xs py-1.5 rounded-md font-medium transition-all",
                        (m === "novo") === modoNovoCliBar ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
                    >
                      {m === "cadastrado" ? "Cliente cadastrado" : "Novo cliente"}
                    </button>
                  ))}
                </div>

                {!modoNovoCliBar && (
                  contaBarSel ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg">
                      <span className="flex-1 text-sm font-medium text-primary">{contaBarSel.clienteNome}</span>
                      <span className="text-xs text-muted-foreground">R$ {contaBarSel.saldo.toFixed(2).replace(".", ",")}</span>
                      <button onClick={() => setContaBarSel(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="Buscar cliente..." value={buscaClienteBar} onChange={(e) => setBuscaCliBar(e.target.value)}
                          className="pl-8 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                      </div>
                      {buscaClienteBar && (
                        <div className="max-h-36 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                          {contasBar.filter((c) => c.clienteNome.toLowerCase().includes(buscaClienteBar.toLowerCase())).length === 0
                            ? <p className="text-center text-xs text-muted-foreground py-3">Nenhum cliente encontrado.</p>
                            : contasBar.filter((c) => c.clienteNome.toLowerCase().includes(buscaClienteBar.toLowerCase())).map((c) => (
                              <button key={c.id} type="button" onClick={() => { setContaBarSel(c); setBuscaCliBar("") }}
                                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/60 transition-colors text-left">
                                <span className="text-sm font-medium text-foreground">{c.clienteNome}</span>
                                <span className="text-xs text-muted-foreground">R$ {c.saldo.toFixed(2).replace(".", ",")}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </>
                  )
                )}

                {modoNovoCliBar && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nome *</Label>
                      <Input placeholder="Nome completo" value={novoNomeBar} onChange={(e) => setNovoNomeBar(e.target.value)}
                        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Telefone</Label>
                      <Input placeholder="(00) 00000-0000" value={novoTelBar} onChange={(e) => setNovoTelBar(e.target.value)}
                        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Busca produto */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Adicionar produto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Digite o nome do produto..." value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)}
                  className="pl-8 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
              {buscaProduto && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {produtosFiltrados.length === 0
                    ? <p className="text-center text-xs text-muted-foreground py-3">Produto não encontrado.</p>
                    : produtosFiltrados.map((p) => (
                      <button key={p.id} type="button" onClick={() => selecionarProduto(p.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/60 transition-colors text-left">
                        <span className="text-sm font-medium text-foreground">{p.nome}</span>
                        <span className="text-sm text-primary font-semibold">R$ {p.preco.toFixed(2).replace(".", ",")}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Carrinho */}
            {itensVenda.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {itensVenda.map((item) => (
                    <div key={item.produtoId} className="flex items-center gap-3 px-3 py-2.5 bg-secondary/40">
                      <span className="text-sm text-foreground font-medium flex-1 min-w-0 truncate">{item.nome}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => ajustarQtd(item.produtoId, -1)} className="w-6 h-6 rounded-md bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-semibold text-foreground w-5 text-center">{item.quantidade}</span>
                        <button onClick={() => ajustarQtd(item.produtoId, 1)} className="w-6 h-6 rounded-md bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-primary shrink-0 w-20 text-right">R$ {(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</span>
                      <button onClick={() => setItensVenda((p) => p.filter((i) => i.produtoId !== item.produtoId))} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 bg-primary/5 border-t border-border">
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <span className="text-lg font-bold text-primary">R$ {totalVenda.toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
            )}
            {itensVenda.length === 0 && <p className="text-center text-xs text-muted-foreground py-1">Digite acima para buscar e adicionar produtos.</p>}

            {erroVenda && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{erroVenda}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogVenda(false)} disabled={isPending}>Cancelar</Button>
              <Button className="flex-1" disabled={itensVenda.length === 0 || isPending} onClick={confirmarVenda}>
                {isPending ? "Salvando…" : modoPag === "FIADO"
                  ? `Lançar no Fiado — R$ ${totalVenda.toFixed(2).replace(".", ",")}`
                  : `${editandoVenda ? "Salvar" : "Confirmar"} — R$ ${totalVenda.toFixed(2).replace(".", ",")}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Excluir venda */}
      <Dialog open={!!confirmarExcVenda} onOpenChange={(o) => !o && setConfExcVenda(null)}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-foreground">Excluir venda?</DialogTitle></DialogHeader>
          {confirmarExcVenda && (
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                Venda de <span className="text-foreground font-medium">{confirmarExcVenda.cliente || "cliente não identificado"}</span> no valor de <span className="text-primary font-semibold">R$ {confirmarExcVenda.total.toFixed(2).replace(".", ",")}</span>. Essa ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-border" onClick={() => setConfExcVenda(null)}>Cancelar</Button>
                <Button variant="destructive" className="flex-1" onClick={async () => { await excluirVenda(confirmarExcVenda.id); setVendas((p) => p.filter((v) => v.id !== confirmarExcVenda.id)); setConfExcVenda(null) }}>Excluir</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════ DIALOGS FIADO ══════════ */}

      {/* Nova conta */}
      <Dialog open={dialogNovaConta} onOpenChange={(o) => { if (!isPending) setDialogNovaConta(o) }}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-foreground">Abrir conta no fiado</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex rounded-lg bg-secondary p-1 gap-1">
              {(["existente", "novo"] as const).map((m) => (
                <button key={m} onClick={() => { setModoNovaConta(m); setErroNovaConta("") }}
                  className={cn("flex-1 text-sm py-1.5 rounded-md font-medium transition-colors",
                    modoNovaConta === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {m === "existente" ? "Cliente cadastrado" : "Novo cliente"}
                </button>
              ))}
            </div>

            {modoNovaConta === "existente" && (
              <div className="space-y-2">
                {clienteSelFiado ? (
                  <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/30 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{clienteSelFiado.nome}</p>
                      {clienteSelFiado.telefone && <p className="text-xs text-muted-foreground">{clienteSelFiado.telefone}</p>}
                    </div>
                    <button onClick={() => { setClienteSelFiado(null); setBuscaCliFiado("") }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input placeholder="Buscar por nome ou telefone..." value={buscaCliFiado} onChange={(e) => setBuscaCliFiado(e.target.value)}
                        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground pl-9" />
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                      {clientesFiado.filter((c) => { const q = buscaCliFiado.toLowerCase(); return !q || c.nome.toLowerCase().includes(q) || (c.telefone ?? "").includes(q) }).map((c) => (
                        <button key={c.id} disabled={c.temConta} onClick={() => setClienteSelFiado(c)}
                          className={cn("w-full text-left px-3 py-2.5 transition-colors", c.temConta ? "opacity-40 cursor-not-allowed bg-secondary/30" : "hover:bg-secondary/60")}>
                          <p className="text-sm font-medium text-foreground">{c.nome}</p>
                          <p className="text-xs text-muted-foreground">{c.telefone ?? "Sem telefone"}{c.temConta && " · já possui conta"}</p>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {modoNovaConta === "novo" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nome *</Label>
                  <Input placeholder="Nome do cliente" value={formNova.nome} onChange={(e) => setFormNova((f) => ({ ...f, nome: e.target.value }))}
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  <Input type="tel" placeholder="(00) 00000-0000" value={formNova.telefone} onChange={(e) => setFormNova((f) => ({ ...f, telefone: e.target.value }))}
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dia de fechamento</Label>
              <Input type="number" min="1" max="31" placeholder="30" value={formNova.diaFechamento}
                onChange={(e) => setFormNova((f) => ({ ...f, diaFechamento: e.target.value }))}
                className="bg-secondary border-border text-foreground" />
            </div>

            {erroNovaConta && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{erroNovaConta}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogNovaConta(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleNovaConta} disabled={isPending}>{isPending ? "Salvando..." : "Abrir conta"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detalhe da conta */}
      <Dialog open={!!contaSel && !dialogLancamento && !dialogPagamento} onOpenChange={(o) => !o && setContaSel(null)}>
        {contaSel && (
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center justify-between pr-6">
                <div>
                  <span>{contaSel.clienteNome}</span>
                  {contaSel.clienteTelefone && <p className="text-xs text-muted-foreground font-normal mt-0.5">{contaSel.clienteTelefone}</p>}
                </div>
                <span className={contaSel.saldo === 0 ? "text-primary text-base" : "text-yellow-600 text-lg"}>
                  {contaSel.saldo === 0 ? "Quitado" : `R$ ${contaSel.saldo.toFixed(2).replace(".", ",")}`}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {contaSel.lancamentos.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem lançamentos.</p>}
              {contaSel.lancamentos.map((l) => (
                <div key={l.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{l.descricao}</p>
                    <p className="text-xs text-muted-foreground">{l.data}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">R$ {l.valor.toFixed(2).replace(".", ",")}</span>
                  <button
                    onClick={() => startTransition(async () => {
                      await excluirLancamento(l.id)
                      const lista = await buscarContas()
                      setContas(lista)
                      const atualizada = lista.find((c) => c.id === contaSel.id) ?? null
                      setContaSel(atualizada)
                    })}
                    disabled={isPending}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-border gap-2"
                onClick={() => { setProdutoSelFiado(null); setBuscaProdFiado(""); setQtdFiado("1"); setDialogLancamento(true) }}>
                <ShoppingCart className="w-4 h-4" />Lançar item
              </Button>
              <Button className="flex-1 gap-2" disabled={contaSel.saldo === 0}
                onClick={() => { setFormPag({ valor: String(contaSel.saldo.toFixed(2)), observacao: "", formaPagamento: "DINHEIRO" }); setDialogPagamento(true) }}>
                <CheckCircle2 className="w-4 h-4" />Receber
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Lançar item */}
      <Dialog open={dialogLancamento} onOpenChange={(o) => { if (!o) setDialogLancamento(false) }}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-foreground">Lançar item — {contaSel?.clienteNome}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Produto</Label>
              {produtoSelFiado ? (
                <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/30 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{produtoSelFiado.nome}</p>
                    <p className="text-xs text-muted-foreground">R$ {produtoSelFiado.preco.toFixed(2).replace(".", ",")} / un.</p>
                  </div>
                  <button onClick={() => { setProdutoSelFiado(null); setBuscaProdFiado("") }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input placeholder="Buscar produto..." value={buscaProdFiado} onChange={(e) => setBuscaProdFiado(e.target.value)}
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground pl-9" />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {prodsFiado.filter((p) => !buscaProdFiado || p.nome.toLowerCase().includes(buscaProdFiado.toLowerCase())).map((p) => (
                      <button key={p.id} onClick={() => setProdutoSelFiado(p)}
                        className="w-full text-left px-3 py-2.5 hover:bg-secondary/60 transition-colors flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{p.nome}</span>
                        <span className="text-sm text-primary font-semibold">R$ {p.preco.toFixed(2).replace(".", ",")}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {produtoSelFiado && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Quantidade</Label>
                  <Input type="number" min="1" value={qtdFiado} onChange={(e) => setQtdFiado(e.target.value)}
                    className="bg-secondary border-border text-foreground" />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-base font-bold text-primary">R$ {valorPreview.toFixed(2).replace(".", ",")}</span>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogLancamento(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleLancamento} disabled={!produtoSelFiado || isPending}>
                {isPending ? "Salvando..." : "Lançar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Registrar pagamento */}
      <Dialog open={dialogPagamento} onOpenChange={(o) => { if (!o) setDialogPagamento(false) }}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-foreground">Receber pagamento — {contaSel?.clienteNome}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Forma de pagamento</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["DINHEIRO", "PIX", "CARTAO"] as const).map((fp) => {
                  const info = pagamentoInfo[fp]
                  const Icon = info.icon
                  return (
                    <button key={fp} type="button"
                      onClick={() => setFormPag((f) => ({ ...f, formaPagamento: fp }))}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-all",
                        formPag.formaPagamento === fp
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />{info.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valor recebido (R$)</Label>
              <Input type="number" step="0.50" min="0.01" value={formPag.valor} onChange={(e) => setFormPag((f) => ({ ...f, valor: e.target.value }))}
                className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Observação</Label>
              <Input placeholder="Opcional" value={formPag.observacao} onChange={(e) => setFormPag((f) => ({ ...f, observacao: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogPagamento(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handlePagamento} disabled={!formPag.valor || isPending}>
                {isPending ? "Salvando..." : `Confirmar · R$ ${parseFloat(formPag.valor || "0").toFixed(2).replace(".", ",")}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════ DIALOGS PRODUTOS ══════════ */}

      {/* Excluir produto */}
      <Dialog open={!!confirmarExcProduto} onOpenChange={(o) => !o && setConfExcProduto(null)}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-foreground">Excluir produto?</DialogTitle></DialogHeader>
          {confirmarExcProduto && (
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                O produto <span className="text-foreground font-medium">{confirmarExcProduto.nome}</span> será removido do cardápio. Vendas anteriores não serão afetadas.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-border" onClick={() => setConfExcProduto(null)}>Cancelar</Button>
                <Button variant="destructive" className="flex-1" onClick={async () => { await excluirProduto(confirmarExcProduto.id); setProdutos((p) => p.filter((x) => x.id !== confirmarExcProduto.id)); setConfExcProduto(null) }}>Excluir</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Novo / Editar produto */}
      <Dialog open={dialogProduto} onOpenChange={setDialogProduto}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-foreground">{editando ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome do produto</Label>
              <Input placeholder="Ex: Cerveja 600ml" value={formProd.nome} onChange={(e) => setFormProd((f) => ({ ...f, nome: e.target.value }))}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Preço (R$)</Label>
                <Input type="number" step="0.50" placeholder="0,00" value={formProd.preco} onChange={(e) => setFormProd((f) => ({ ...f, preco: e.target.value }))}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <Select value={formProd.categoria} onValueChange={(v) => setFormProd((f) => ({ ...f, categoria: v as Produto["categoria"] }))}>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="BEBIDA" className="text-foreground">Bebida</SelectItem>
                    <SelectItem value="ALIMENTO" className="text-foreground">Alimento</SelectItem>
                    <SelectItem value="OUTRO" className="text-foreground">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Estoque atual (un.)</Label>
                <Input type="number" min="0" step="1" value={formProd.estoque} onChange={(e) => setFormProd((f) => ({ ...f, estoque: e.target.value }))}
                  className="bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mínimo para alerta</Label>
                <Input type="number" min="0" step="1" value={formProd.estoqueMinimo} onChange={(e) => setFormProd((f) => ({ ...f, estoqueMinimo: e.target.value }))}
                  className="bg-secondary border-border text-foreground" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogProduto(false)}>Cancelar</Button>
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
