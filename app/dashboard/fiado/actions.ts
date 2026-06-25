"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

async function getTenantId() {
  const session = await auth()
  const tenantId = (session?.user as any)?.tenantId
  if (!tenantId) throw new Error("Não autorizado")
  return tenantId
}

export async function buscarContas() {
  const tenantId = await getTenantId()
  const contas = await db.contaFiado.findMany({
    where: { cliente: { tenantId } },
    include: {
      cliente: true,
      lancamentos: { orderBy: { criadoEm: "desc" } },
      pagamentos: true,
    },
  })

  return contas.map((c) => {
    const totalLanc = c.lancamentos.reduce((s, l) => s + Number(l.valor), 0)
    const totalPag  = c.pagamentos.reduce((s, p) => s + Number(p.valor), 0)
    return {
      id: c.id,
      clienteNome:     c.cliente.nome,
      clienteTelefone: c.cliente.telefone ?? "",
      diaFechamento:   c.diaFechamento,
      saldo: Math.max(0, totalLanc - totalPag),
      lancamentos: c.lancamentos.map((l) => ({
        id:       l.id,
        descricao: l.descricao,
        valor:    Number(l.valor),
        data:     l.criadoEm.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      })),
    }
  })
}

export async function criarConta(data: {
  nome: string
  telefone: string
  diaFechamento: number
}) {
  const tenantId = await getTenantId()
  const cliente = await db.cliente.create({
    data: { nome: data.nome, telefone: data.telefone || null, tenantId },
  })
  await db.contaFiado.create({
    data: { clienteId: cliente.id, diaFechamento: data.diaFechamento },
  })
  revalidatePath("/dashboard/fiado")
  revalidatePath("/dashboard")
}

export async function lancarItem(data: {
  contaId:   string
  produtoId: string
  quantidade: number
}) {
  const produto = await db.produto.findUnique({ where: { id: data.produtoId } })
  if (!produto) throw new Error("Produto não encontrado")

  const valor    = Number(produto.preco) * data.quantidade
  const descricao = data.quantidade > 1 ? `${produto.nome} x${data.quantidade}` : produto.nome

  await db.lancamentoFiado.create({
    data: { contaId: data.contaId, descricao, valor, produtoId: data.produtoId },
  })
  revalidatePath("/dashboard/fiado")
  revalidatePath("/dashboard")
}

export async function registrarPagamento(data: {
  contaId:    string
  valor:      number
  observacao: string | null
}) {
  await db.pagamentoFiado.create({
    data: { contaId: data.contaId, valor: data.valor, observacao: data.observacao },
  })
  revalidatePath("/dashboard/fiado")
  revalidatePath("/dashboard")
}

export async function buscarProdutosAtivos() {
  const tenantId = await getTenantId()
  const produtos = await db.produto.findMany({
    where: { tenantId, ativo: true },
    orderBy: { nome: "asc" },
  })
  return produtos.map((p) => ({ id: p.id, nome: p.nome, preco: Number(p.preco) }))
}
