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

export async function buscarProdutos() {
  const tenantId = await getTenantId()
  const lista = await db.produto.findMany({
    where: { tenantId },
    orderBy: { nome: "asc" },
  })
  return lista.map((p) => ({ ...p, preco: Number(p.preco) }))
}

export async function criarProduto(data: {
  nome: string
  preco: number
  categoria: "BEBIDA" | "ALIMENTO" | "OUTRO"
}) {
  const tenantId = await getTenantId()
  await db.produto.create({
    data: { ...data, tenantId },
  })
  revalidatePath("/dashboard/bar")
}

export async function atualizarProduto(
  id: string,
  data: { nome: string; preco: number; categoria: "BEBIDA" | "ALIMENTO" | "OUTRO" }
) {
  await getTenantId()
  await db.produto.update({ where: { id }, data })
  revalidatePath("/dashboard/bar")
}

// ── Vendas ────────────────────────────────────────────────────────────────────

type ItemInput = { produtoId: string; nome: string; preco: number; quantidade: number }

export async function buscarVendas() {
  const tenantId = await getTenantId()
  const hoje = new Date()
  const dateKey = hoje.toISOString().slice(0, 10)

  const vendas = await db.venda.findMany({
    where: {
      tenantId,
      criadoEm: {
        gte: new Date(`${dateKey}T00:00:00`),
        lte: new Date(`${dateKey}T23:59:59`),
      },
    },
    include: { itens: true },
    orderBy: { criadoEm: "desc" },
  })

  return vendas.map((v) => ({
    id: v.id,
    cliente: v.cliente ?? "",
    formaPagamento: v.formaPagamento as "DINHEIRO" | "PIX" | "CARTAO",
    total: Number(v.total),
    hora: v.criadoEm.toISOString(),
    itens: v.itens.map((i) => ({
      produtoId: i.produtoId,
      nome: i.nome,
      preco: Number(i.preco),
      quantidade: i.quantidade,
    })),
  }))
}

export async function criarVenda(data: {
  cliente: string
  formaPagamento: "DINHEIRO" | "PIX" | "CARTAO"
  total: number
  itens: ItemInput[]
}) {
  const tenantId = await getTenantId()
  await db.venda.create({
    data: {
      tenantId,
      cliente: data.cliente || null,
      formaPagamento: data.formaPagamento,
      total: data.total,
      itens: {
        create: data.itens.map((i) => ({
          produtoId: i.produtoId,
          nome: i.nome,
          preco: i.preco,
          quantidade: i.quantidade,
        })),
      },
    },
  })
  revalidatePath("/dashboard/bar")
  revalidatePath("/dashboard")
}

export async function atualizarVenda(
  id: string,
  data: { cliente: string; formaPagamento: "DINHEIRO" | "PIX" | "CARTAO"; total: number; itens: ItemInput[] }
) {
  await getTenantId()
  await db.itemVenda.deleteMany({ where: { vendaId: id } })
  await db.venda.update({
    where: { id },
    data: {
      cliente: data.cliente || null,
      formaPagamento: data.formaPagamento,
      total: data.total,
      itens: {
        create: data.itens.map((i) => ({
          produtoId: i.produtoId,
          nome: i.nome,
          preco: i.preco,
          quantidade: i.quantidade,
        })),
      },
    },
  })
  revalidatePath("/dashboard/bar")
  revalidatePath("/dashboard")
}

export async function excluirVenda(id: string) {
  await getTenantId()
  await db.venda.delete({ where: { id } })
  revalidatePath("/dashboard/bar")
  revalidatePath("/dashboard")
}
