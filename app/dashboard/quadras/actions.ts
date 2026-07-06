"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

async function getTenantId() {
  const session = await auth()
  const user = await db.usuario.findUnique({ where: { email: session?.user?.email! } })
  return user!.tenantId
}

export async function buscarQuadra() {
  const tenantId = await getTenantId()
  const rows = await db.$queryRaw<Array<{
    id: string
    nome: string
    descricao: string | null
    ativa: boolean
    horaAbertura: string
    horaFechamento: string
    diasFuncionamento: string
    valor1h: string | null
    valor1h30: string | null
    valor2h: string | null
  }>>`
    SELECT id, nome, descricao, ativa,
           "horaAbertura", "horaFechamento", "diasFuncionamento",
           valor1h::text, valor1h30::text, valor2h::text
    FROM "Quadra"
    WHERE "tenantId" = ${tenantId}
    LIMIT 1
  `
  if (!rows[0]) return null
  const q = rows[0]
  return {
    ...q,
    endereco:  null as string | null,
    valor1h:   q.valor1h   ? Number(q.valor1h)   : null,
    valor1h30: q.valor1h30 ? Number(q.valor1h30) : null,
    valor2h:   q.valor2h   ? Number(q.valor2h)   : null,
  }
}

export type QuadraData = {
  nome: string
  descricao: string
  endereco: string
  horaAbertura: string
  horaFechamento: string
  diasFuncionamento: string
  valor1h: string
  valor1h30: string
  valor2h: string
}

function toDecimal(v: string): number | null {
  const n = parseFloat(v.replace(",", "."))
  return isNaN(n) || n <= 0 ? null : n
}

export async function criarQuadra(dados: QuadraData) {
  const tenantId = await getTenantId()
  await db.$executeRaw`
    INSERT INTO "Quadra" (
      id, "tenantId", nome, descricao,
      "horaAbertura", "horaFechamento", "diasFuncionamento",
      valor1h, valor1h30, valor2h, ativa
    ) VALUES (
      gen_random_uuid(),
      ${tenantId},
      ${dados.nome.trim()},
      ${dados.descricao.trim() || null},
      ${dados.horaAbertura},
      ${dados.horaFechamento},
      ${dados.diasFuncionamento},
      ${toDecimal(dados.valor1h)},
      ${toDecimal(dados.valor1h30)},
      ${toDecimal(dados.valor2h)},
      true
    )
  `
  revalidatePath("/dashboard/quadras")
  revalidatePath("/dashboard/agendamentos")
}

export async function atualizarQuadra(id: string, dados: QuadraData) {
  const tenantId = await getTenantId()
  await db.$executeRaw`
    UPDATE "Quadra" SET
      nome               = ${dados.nome.trim()},
      descricao          = ${dados.descricao.trim() || null},
      "horaAbertura"     = ${dados.horaAbertura},
      "horaFechamento"   = ${dados.horaFechamento},
      "diasFuncionamento"= ${dados.diasFuncionamento},
      valor1h            = ${toDecimal(dados.valor1h)},
      valor1h30          = ${toDecimal(dados.valor1h30)},
      valor2h            = ${toDecimal(dados.valor2h)}
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `
  revalidatePath("/dashboard/quadras")
  revalidatePath("/dashboard/agendamentos")
}
