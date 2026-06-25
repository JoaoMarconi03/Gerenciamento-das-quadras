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
