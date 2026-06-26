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

  const rows = await db.$queryRaw<Array<{
    id: string
    cliente: string | null
    formaPagamento: string
    total: string
    criadoEm: Date
    itemId: string
    produtoId: string
    nome: string
    preco: string
    quantidade: number
  }>>`
    SELECT
      v.id, v.cliente, v."formaPagamento"::text, v.total::text, v."criadoEm",
      i.id AS "itemId", i."produtoId", i.nome, i.preco::text, i.quantidade
    FROM "Venda" v
    JOIN "ItemVenda" i ON i."vendaId" = v.id
    WHERE v."tenantId" = ${tenantId}
      AND TO_CHAR(v."criadoEm", 'YYYY-MM-DD') = TO_CHAR(NOW(), 'YYYY-MM-DD')
    ORDER BY v."criadoEm" DESC
  `

  const map = new Map<string, (typeof rows)[0] & { itens: typeof rows }>()
  for (const r of rows) {
    if (!map.has(r.id)) {
      map.set(r.id, { ...r, itens: [] })
    }
    map.get(r.id)!.itens.push(r)
  }

  return Array.from(map.values()).map((v) => ({
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

  const rows = await db.$queryRaw<[{ id: string }]>`
    INSERT INTO "Venda" (id, "tenantId", cliente, "formaPagamento", total, "criadoEm")
    VALUES (
      gen_random_uuid(),
      ${tenantId},
      ${data.cliente || null},
      ${data.formaPagamento}::"FormaPagamento",
      ${data.total},
      NOW()
    )
    RETURNING id
  `
  const vendaId = rows[0].id

  for (const item of data.itens) {
    await db.$executeRaw`
      INSERT INTO "ItemVenda" (id, "vendaId", "produtoId", nome, preco, quantidade)
      VALUES (
        gen_random_uuid(),
        ${vendaId},
        ${item.produtoId},
        ${item.nome},
        ${item.preco},
        ${item.quantidade}
      )
    `
  }

  revalidatePath("/dashboard/bar")
  revalidatePath("/dashboard")
}

export async function atualizarVenda(
  id: string,
  data: { cliente: string; formaPagamento: "DINHEIRO" | "PIX" | "CARTAO"; total: number; itens: ItemInput[] }
) {
  await getTenantId()

  await db.$executeRaw`
    DELETE FROM "ItemVenda" WHERE "vendaId" = ${id}
  `
  await db.$executeRaw`
    UPDATE "Venda"
    SET cliente = ${data.cliente || null},
        "formaPagamento" = ${data.formaPagamento}::"FormaPagamento",
        total = ${data.total}
    WHERE id = ${id}
  `
  for (const item of data.itens) {
    await db.$executeRaw`
      INSERT INTO "ItemVenda" (id, "vendaId", "produtoId", nome, preco, quantidade)
      VALUES (
        gen_random_uuid(),
        ${id},
        ${item.produtoId},
        ${item.nome},
        ${item.preco},
        ${item.quantidade}
      )
    `
  }

  revalidatePath("/dashboard/bar")
  revalidatePath("/dashboard")
}

export async function excluirVenda(id: string) {
  await getTenantId()
  await db.$executeRaw`DELETE FROM "ItemVenda" WHERE "vendaId" = ${id}`
  await db.$executeRaw`DELETE FROM "Venda" WHERE id = ${id}`
  revalidatePath("/dashboard/bar")
  revalidatePath("/dashboard")
}
