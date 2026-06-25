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
  const q = await db.quadra.findFirst({ where: { tenantId } })
  if (!q) return null
  return {
    ...q,
    valor1h:   q.valor1h   ? Number(q.valor1h)   : null,
    valor1h30: q.valor1h30 ? Number(q.valor1h30) : null,
    valor2h:   q.valor2h   ? Number(q.valor2h)   : null,
  }
}

export type QuadraData = {
  nome: string
  descricao: string
  horaAbertura: string
  horaFechamento: string
  diasFuncionamento: string
  valor1h: string
  valor1h30: string
  valor2h: string
}

export async function atualizarQuadra(id: string, dados: QuadraData) {
  const tenantId = await getTenantId()

  const toDecimal = (v: string) => {
    const n = parseFloat(v.replace(",", "."))
    return isNaN(n) || n <= 0 ? null : n
  }

  await db.quadra.update({
    where: { id, tenantId },
    data: {
      nome:              dados.nome.trim(),
      descricao:         dados.descricao.trim() || null,
      horaAbertura:      dados.horaAbertura,
      horaFechamento:    dados.horaFechamento,
      diasFuncionamento: dados.diasFuncionamento,
      valor1h:           toDecimal(dados.valor1h),
      valor1h30:         toDecimal(dados.valor1h30),
      valor2h:           toDecimal(dados.valor2h),
    },
  })

  revalidatePath("/dashboard/quadras")
  revalidatePath("/dashboard/agendamentos")
}
