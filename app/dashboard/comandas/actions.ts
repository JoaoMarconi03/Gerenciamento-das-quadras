"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
export type AlertaEstoque = { nome: string; estoque: number; estoqueMinimo: number }

async function getTenantId() {
  const session = await auth()
  const tenantId = (session?.user as any)?.tenantId
  if (!tenantId) throw new Error("Não autorizado")
  return tenantId
}

export type ItemComanda = {
  id: string
  produtoId: string | null
  produtoNome: string
  preco: number
  quantidade: number
}

export type Comanda = {
  id: string
  clienteNome: string
  clienteTelefone: string | null
  criadoEm: string
  itens: ItemComanda[]
  total: number
}

export async function buscarComandasAbertas(): Promise<Comanda[]> {
  const tenantId = await getTenantId()

  const rows = await db.$queryRaw<Array<{
    id: string
    clienteNome: string
    clienteTelefone: string | null
    criadoEm: Date
    itemId: string | null
    produtoId: string | null
    produtoNome: string | null
    preco: string | null
    quantidade: number | null
  }>>`
    SELECT
      c.id, c."clienteNome", c."clienteTelefone", c."criadoEm",
      i.id AS "itemId", i."produtoId", i."produtoNome", i.preco::text, i.quantidade
    FROM "Comanda" c
    LEFT JOIN "ItemComanda" i ON i."comandaId" = c.id
    WHERE c."tenantId" = ${tenantId} AND c.status = 'ABERTA'::"StatusComanda"
    ORDER BY c."criadoEm" DESC, i."produtoNome" ASC
  `

  const map = new Map<string, Comanda>()

  for (const r of rows) {
    if (!map.has(r.id)) {
      map.set(r.id, {
        id: r.id,
        clienteNome: r.clienteNome,
        clienteTelefone: r.clienteTelefone,
        criadoEm: r.criadoEm.toISOString(),
        itens: [],
        total: 0,
      })
    }
    if (r.itemId && r.produtoNome && r.preco) {
      const preco = Number(r.preco)
      const quantidade = r.quantidade ?? 1
      map.get(r.id)!.itens.push({
        id: r.itemId,
        produtoId: r.produtoId,
        produtoNome: r.produtoNome,
        preco,
        quantidade,
      })
      map.get(r.id)!.total += preco * quantidade
    }
  }

  return Array.from(map.values())
}

export async function buscarClientesParaComanda() {
  const tenantId = await getTenantId()
  const rows = await db.$queryRaw<Array<{ id: string; nome: string; telefone: string | null }>>`
    SELECT id, nome, telefone
    FROM "Cliente"
    WHERE "tenantId" = ${tenantId}
    ORDER BY nome ASC
  `
  return rows
}

export async function buscarProdutosParaComanda() {
  const tenantId = await getTenantId()
  const rows = await db.$queryRaw<Array<{
    id: string; nome: string; preco: string; categoria: string; estoque: number
  }>>`
    SELECT id, nome, preco::text, categoria::text, estoque
    FROM "Produto"
    WHERE "tenantId" = ${tenantId} AND ativo = true
    ORDER BY nome ASC
  `
  return rows.map((r) => ({ ...r, preco: Number(r.preco) }))
}

export async function abrirComanda(data: { clienteNome: string; clienteTelefone?: string }) {
  const tenantId = await getTenantId()
  const rows = await db.$queryRaw<[{ id: string }]>`
    INSERT INTO "Comanda" (id, "tenantId", "clienteNome", "clienteTelefone", status, "criadoEm")
    VALUES (
      gen_random_uuid(),
      ${tenantId},
      ${data.clienteNome.trim()},
      ${data.clienteTelefone?.trim() || null},
      'ABERTA'::"StatusComanda",
      NOW()
    )
    RETURNING id
  `
  revalidatePath("/dashboard/comandas")
  return rows[0].id
}

export async function adicionarItemComanda(data: {
  comandaId: string
  produtoId: string
  produtoNome: string
  preco: number
  quantidade: number
}): Promise<{ alerta: AlertaEstoque | null }> {
  await getTenantId()

  await db.$executeRaw`
    INSERT INTO "ItemComanda" (id, "comandaId", "produtoId", "produtoNome", preco, quantidade)
    VALUES (gen_random_uuid(), ${data.comandaId}, ${data.produtoId}, ${data.produtoNome}, ${data.preco}, ${data.quantidade})
  `

  await db.$executeRaw`
    UPDATE "Produto" SET estoque = GREATEST(0, estoque - ${data.quantidade}) WHERE id = ${data.produtoId}
  `

  const pRows = await db.$queryRaw<Array<AlertaEstoque>>`
    SELECT nome, estoque, "estoqueMinimo" FROM "Produto" WHERE id = ${data.produtoId}
  `

  revalidatePath("/dashboard/comandas")

  if (pRows[0] && pRows[0].estoque <= pRows[0].estoqueMinimo) {
    return { alerta: pRows[0] }
  }
  return { alerta: null }
}

export async function removerItemComanda(itemId: string, produtoId: string | null, quantidade: number) {
  await getTenantId()
  await db.$executeRaw`DELETE FROM "ItemComanda" WHERE id = ${itemId}`
  if (produtoId) {
    await db.$executeRaw`
      UPDATE "Produto" SET estoque = estoque + ${quantidade} WHERE id = ${produtoId}
    `
  }
  revalidatePath("/dashboard/comandas")
}

export async function fecharComanda(data: {
  comandaId: string
  formaPagamento: "DINHEIRO" | "PIX" | "CARTAO"
  clienteNome: string
  total: number
}) {
  const tenantId = await getTenantId()

  await db.$executeRaw`
    UPDATE "Comanda"
    SET status = 'FECHADA'::"StatusComanda",
        "formaPagamento" = ${data.formaPagamento}::"FormaPagamento",
        "fechadoEm" = NOW()
    WHERE id = ${data.comandaId} AND "tenantId" = ${tenantId}
  `

  const itens = await db.$queryRaw<Array<{
    produtoId: string | null; produtoNome: string; preco: string; quantidade: number
  }>>`
    SELECT "produtoId", "produtoNome", preco::text, quantidade FROM "ItemComanda" WHERE "comandaId" = ${data.comandaId}
  `

  if (itens.length > 0) {
    const vendaRows = await db.$queryRaw<[{ id: string }]>`
      INSERT INTO "Venda" (id, "tenantId", cliente, "formaPagamento", total, "criadoEm")
      VALUES (gen_random_uuid(), ${tenantId}, ${data.clienteNome}, ${data.formaPagamento}::"FormaPagamento", ${data.total}, NOW())
      RETURNING id
    `
    const vendaId = vendaRows[0].id
    for (const item of itens) {
      await db.$executeRaw`
        INSERT INTO "ItemVenda" (id, "vendaId", "produtoId", nome, preco, quantidade)
        VALUES (gen_random_uuid(), ${vendaId}, ${item.produtoId}, ${item.produtoNome}, ${item.preco}, ${item.quantidade})
      `
    }
  }

  revalidatePath("/dashboard/comandas")
  revalidatePath("/dashboard/bar")
  revalidatePath("/dashboard")
}

export async function cancelarComanda(comandaId: string) {
  const tenantId = await getTenantId()

  const itens = await db.$queryRaw<Array<{ produtoId: string | null; quantidade: number }>>`
    SELECT "produtoId", quantidade FROM "ItemComanda" WHERE "comandaId" = ${comandaId}
  `

  for (const item of itens) {
    if (item.produtoId) {
      await db.$executeRaw`
        UPDATE "Produto" SET estoque = estoque + ${item.quantidade} WHERE id = ${item.produtoId}
      `
    }
  }

  await db.$executeRaw`
    UPDATE "Comanda" SET status = 'CANCELADA'::"StatusComanda", "fechadoEm" = NOW()
    WHERE id = ${comandaId} AND "tenantId" = ${tenantId}
  `

  revalidatePath("/dashboard/comandas")
}
