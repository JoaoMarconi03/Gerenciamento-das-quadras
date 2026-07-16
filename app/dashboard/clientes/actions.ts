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

export async function buscarClientes() {
  const tenantId = await getTenantId()
  const rows = await db.$queryRaw<Array<{
    id: string; nome: string; telefone: string | null; email: string | null
    usuarioId: string | null; tipoCliente: string
    totalAgendamentos: bigint; assinaturasAtivas: bigint
  }>>`
    SELECT
      c.id, c.nome, c.telefone, c.email, c."usuarioId",
      COALESCE(c."tipoCliente", 'AVULSO') AS "tipoCliente",
      (SELECT COUNT(*) FROM "Agendamento" WHERE "clienteId" = c.id)::bigint AS "totalAgendamentos",
      (SELECT COUNT(*) FROM "Assinatura" WHERE "clienteId" = c.id AND status = 'ATIVA'::"StatusAssinatura")::bigint AS "assinaturasAtivas"
    FROM "Cliente" c
    WHERE c."tenantId" = ${tenantId}
    ORDER BY c.nome ASC
  `
  return rows.map((c) => ({
    id:                c.id,
    nome:              c.nome,
    telefone:          c.telefone,
    email:             c.email,
    usuarioId:         c.usuarioId,
    tipoCliente:       c.tipoCliente as "AVULSO" | "MENSALISTA",
    totalAgendamentos: Number(c.totalAgendamentos),
    mensalista:        c.tipoCliente === "MENSALISTA" || Number(c.assinaturasAtivas) > 0,
  }))
}

export async function buscarUsuariosClientes() {
  const tenantId = await getTenantId()
  const usuarios = await db.usuario.findMany({
    where: { tenantId, role: "CLIENTE" },
    orderBy: { nome: "asc" },
  })
  return usuarios.map((u) => ({
    id:    u.id,
    nome:  u.nome,
    email: u.email,
  }))
}

// Encontra o Cliente existente vinculado ao usuarioId ou cria um novo.
// Retorna { clienteId, clienteNome }.
export async function vincularOuBuscarCliente(usuarioId: string): Promise<{ clienteId: string; clienteNome: string }> {
  const tenantId = await getTenantId()

  const existente = await db.cliente.findUnique({ where: { usuarioId } })
  if (existente) return { clienteId: existente.id, clienteNome: existente.nome }

  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } })
  if (!usuario) throw new Error("Usuário não encontrado")

  const cliente = await db.cliente.create({
    data: {
      nome:      usuario.nome,
      email:     usuario.email,
      usuarioId,
      tenantId,
    },
  })

  revalidatePath("/dashboard/clientes")
  return { clienteId: cliente.id, clienteNome: cliente.nome }
}

export async function criarClienteManual(dados: {
  nome:        string
  telefone:    string
  email:       string
  tipoCliente: "AVULSO" | "MENSALISTA"
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const tenantId = await getTenantId()
    const telefone = dados.telefone.trim() || null
    const email    = dados.email.trim()    || null
    await db.$executeRaw`
      INSERT INTO "Cliente" (id, nome, telefone, email, "tipoCliente", "tenantId", "criadoEm")
      VALUES (gen_random_uuid(), ${dados.nome.trim()}, ${telefone}, ${email}, ${dados.tipoCliente}, ${tenantId}, NOW())
    `
    revalidatePath("/dashboard/clientes")
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) }
  }
}

export async function editarCliente(
  id: string,
  dados: { nome: string; telefone: string; email: string; tipoCliente: "AVULSO" | "MENSALISTA" },
) {
  await getTenantId()
  const telefone = dados.telefone.trim() || null
  const email    = dados.email.trim()    || null
  await db.$executeRaw`
    UPDATE "Cliente"
    SET nome        = ${dados.nome.trim()},
        telefone    = ${telefone},
        email       = ${email},
        "tipoCliente" = ${dados.tipoCliente}
    WHERE id = ${id}
  `
  revalidatePath("/dashboard/clientes")
}

export async function excluirCliente(id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    await getTenantId()

    // Usa $executeRaw para evitar transações implícitas do Prisma (Neon HTTP mode)

    // 1. Desvincula agendamentos (clienteId nullable)
    await db.$executeRaw`
      UPDATE "Agendamento" SET "clienteId" = NULL WHERE "clienteId" = ${id}
    `

    // 2. Lançamentos e pagamentos do fiado
    await db.$executeRaw`
      DELETE FROM "LancamentoFiado"
      WHERE "contaId" IN (SELECT id FROM "ContaFiado" WHERE "clienteId" = ${id})
    `
    await db.$executeRaw`
      DELETE FROM "PagamentoFiado"
      WHERE "contaId" IN (SELECT id FROM "ContaFiado" WHERE "clienteId" = ${id})
    `
    await db.$executeRaw`
      DELETE FROM "ContaFiado" WHERE "clienteId" = ${id}
    `

    // 3. Pagamentos mensais e assinaturas
    await db.$executeRaw`
      DELETE FROM "PagamentoMensal"
      WHERE "assinaturaId" IN (SELECT id FROM "Assinatura" WHERE "clienteId" = ${id})
    `
    await db.$executeRaw`
      DELETE FROM "Assinatura" WHERE "clienteId" = ${id}
    `

    // 4. Exclui o cliente
    await db.$executeRaw`
      DELETE FROM "Cliente" WHERE id = ${id}
    `

    revalidatePath("/dashboard/clientes")
    return { ok: true }
  } catch (e) {
    console.error("[excluirCliente]", e)
    return { ok: false, erro: e instanceof Error ? e.message : String(e) }
  }
}
