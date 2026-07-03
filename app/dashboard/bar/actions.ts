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
    where: { tenantId, ativo: true },
    orderBy: { nome: "asc" },
  })
  return lista.map((p) => ({ ...p, preco: Number(p.preco) }))
}

export async function excluirProduto(id: string) {
  await getTenantId()
  await db.produto.update({ where: { id }, data: { ativo: false } })
  revalidatePath("/dashboard/bar")
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
    itemId: string | null
    produtoId: string | null
    nome: string | null
    preco: string | null
    quantidade: number | null
  }>>`
    SELECT
      v.id, v.cliente, v."formaPagamento"::text, v.total::text, v."criadoEm",
      i.id AS "itemId", i."produtoId", i.nome, i.preco::text, i.quantidade
    FROM "Venda" v
    LEFT JOIN "ItemVenda" i ON i."vendaId" = v.id
    WHERE v."tenantId" = ${tenantId}
      AND TO_CHAR(v."criadoEm", 'YYYY-MM-DD') = TO_CHAR(NOW(), 'YYYY-MM-DD')
    ORDER BY v."criadoEm" DESC
  `

  const map = new Map<string, (typeof rows)[0] & { itens: typeof rows }>()
  for (const r of rows) {
    if (!map.has(r.id)) {
      map.set(r.id, { ...r, itens: [] })
    }
    if (r.itemId) {
      map.get(r.id)!.itens.push(r)
    }
  }

  return Array.from(map.values()).map((v) => ({
    id: v.id,
    cliente: v.cliente ?? "",
    formaPagamento: v.formaPagamento as "DINHEIRO" | "PIX" | "CARTAO",
    total: Number(v.total),
    hora: v.criadoEm.toISOString(),
    itens: v.itens.map((i) => ({
      produtoId: i.produtoId ?? "",
      nome: i.nome ?? "",
      preco: Number(i.preco ?? 0),
      quantidade: i.quantidade ?? 1,
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

// ── Fiado via Bar ─────────────────────────────────────────────────────────────

export async function buscarContasFiado() {
  const tenantId = await getTenantId()
  const contas = await db.contaFiado.findMany({
    where: { cliente: { tenantId } },
    include: {
      cliente: { select: { nome: true } },
      lancamentos: { select: { valor: true } },
      pagamentos: { select: { valor: true } },
    },
    orderBy: { cliente: { nome: "asc" } },
  })
  return contas.map((c) => {
    const totalLanc = c.lancamentos.reduce((s, l) => s + Number(l.valor), 0)
    const totalPag  = c.pagamentos.reduce((s, p) => s + Number(p.valor), 0)
    return {
      id:          c.id,
      clienteNome: c.cliente.nome,
      saldo:       Math.max(0, totalLanc - totalPag),
    }
  })
}

export async function criarVendaFiado(data: {
  contaId: string
  itens: { produtoId: string; nome: string; preco: number; quantidade: number }[]
}) {
  await getTenantId()
  for (const item of data.itens) {
    const descricao = item.quantidade > 1 ? `${item.nome} x${item.quantidade}` : item.nome
    const valor     = item.preco * item.quantidade
    await db.lancamentoFiado.create({
      data: { contaId: data.contaId, descricao, valor, produtoId: item.produtoId },
    })
  }
  revalidatePath("/dashboard/fiado")
  revalidatePath("/dashboard")
}

export async function criarClienteEContaFiado(data: {
  nome:     string
  telefone?: string
}): Promise<{ ok: boolean; contaId?: string; erro?: string }> {
  try {
    const tenantId = await getTenantId()
    if (!data.nome?.trim()) return { ok: false, erro: "Nome é obrigatório." }
    const cliente = await db.cliente.create({
      data: { nome: data.nome.trim(), telefone: data.telefone?.trim() || null, tenantId },
    })
    const conta = await db.contaFiado.create({
      data: { clienteId: cliente.id, diaFechamento: 1 },
    })
    revalidatePath("/dashboard/fiado")
    return { ok: true, contaId: conta.id }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) }
  }
}

export async function buscarTotalMes(): Promise<number> {
  const tenantId = await getTenantId()
  const result = await db.$queryRaw<[{ total: string }]>`
    SELECT COALESCE(SUM(total), 0)::text AS total
    FROM "Venda"
    WHERE "tenantId" = ${tenantId}
      AND DATE_TRUNC('month', "criadoEm") = DATE_TRUNC('month', NOW())
  `
  return Number(result[0].total)
}
