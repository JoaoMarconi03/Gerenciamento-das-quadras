"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { parseISO, endOfMonth, addWeeks, isAfter, format } from "date-fns"

async function getSession() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")
  return session
}

async function verificarAdmin() {
  const session = await getSession()
  const role = (session.user as any)?.role
  if (role !== "ADMIN" && role !== "STAFF") throw new Error("Não autorizado")
  return session
}

// ── Leitura ──────────────────────────────────────────────────────────────────

export async function buscarAgendamentosPorData(dateKey: string) {
  const session = await getSession()
  const tenantId = (session.user as any)?.tenantId
  if (!tenantId) return []

  type Row = {
    id:          string
    observacao:  string | null
    tipo:        string
    valor:       string | null
    status:      string
    clienteNome: string | null
    inicioHora:  string
    fimHora:     string
  }

  const rows = await db.$queryRaw<Row[]>`
    SELECT
      ag.id,
      ag.observacao,
      ag.tipo::text,
      ag.valor::text,
      ag.status::text,
      cl.nome AS "clienteNome",
      TO_CHAR(ag.inicio, 'HH24:MI') AS "inicioHora",
      TO_CHAR(ag.fim,    'HH24:MI') AS "fimHora"
    FROM "Agendamento" ag
    JOIN "Quadra" q ON ag."quadraId" = q.id
    LEFT JOIN "Cliente" cl ON ag."clienteId" = cl.id
    WHERE q."tenantId" = ${tenantId}
      AND TO_CHAR(ag.inicio, 'YYYY-MM-DD') = ${dateKey}
    ORDER BY ag.inicio ASC
  `

  return rows.map((r) => {
    const [ih, im] = r.inicioHora.split(":").map(Number)
    const [fh, fm] = r.fimHora.split(":").map(Number)
    const inicioMin = ih * 60 + im
    const fimRaw    = fh * 60 + fm
    // "00:00" no retorno do DB significa meia-noite (próximo dia)
    const fimMin    = fimRaw === 0 ? 24 * 60 : fimRaw
    const duracaoMin = fimMin - inicioMin
    return {
      id:          r.id,
      clienteNome: r.clienteNome ?? r.observacao ?? "Avulso",
      inicio:      { h: ih, m: im },
      duracaoMin,
      tipo:        r.tipo as "AVULSO" | "MENSALISTA",
      valor:       r.valor ? Number(r.valor) : 0,
      status:      r.status as "CONFIRMADO" | "PENDENTE" | "CANCELADO" | "PAGO",
    }
  })
}

export async function buscarQuadraAtiva() {
  const session = await getSession()
  const tenantId = (session.user as any)?.tenantId
  if (!tenantId) return null
  const quadra = await db.quadra.findFirst({ where: { tenantId, ativa: true } })
  return quadra ? { id: quadra.id, nome: quadra.nome } : null
}

// ── Aprovação / cancelamento ─────────────────────────────────────────────────

export async function aprovarAgendamento(id: string) {
  await verificarAdmin()
  await db.agendamento.update({ where: { id }, data: { status: "CONFIRMADO" } })
  revalidatePath("/dashboard/agendamentos")
}

export async function cancelarAgendamento(id: string) {
  await verificarAdmin()
  await db.agendamento.update({ where: { id }, data: { status: "CANCELADO" } })
  revalidatePath("/dashboard/agendamentos")
}

// ── Registro de pagamento ─────────────────────────────────────────────────────

export async function registrarPagamentoAgendamento(id: string) {
  await getSession()
  await db.agendamento.update({
    where: { id },
    data: {
      status: "PAGO",
      pagamentoRegistrado: true,
      pagamentoRegistradoEm: new Date(),
    },
  })
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/pagamentos")
}

// ── Edição e exclusão ─────────────────────────────────────────────────────────

export async function excluirAgendamento(id: string) {
  await getSession()
  await db.agendamento.delete({ where: { id } })
  revalidatePath("/dashboard/agendamentos")
  revalidatePath("/dashboard")
}

export async function editarAgendamento(id: string, dados: {
  nomeCliente: string
  data:        string  // "YYYY-MM-DD"
  horaInicio:  string  // "HH:MM"
  duracaoMin:  number
  valor:       number
}) {
  await getSession()
  const horaFim   = calcFim(dados.horaInicio, dados.duracaoMin)
  const inicioStr = `${dados.data} ${dados.horaInicio}:00`
  const fimStr    = `${dados.data} ${horaFim}:00`

  await db.$executeRaw`
    UPDATE "Agendamento"
    SET inicio    = ${inicioStr}::timestamp,
        fim       = ${fimStr}::timestamp,
        observacao = ${dados.nomeCliente},
        valor     = ${dados.valor}::decimal
    WHERE id = ${id}
  `
  revalidatePath("/dashboard/agendamentos")
  revalidatePath("/dashboard")
}

// ── Criação pelo admin ────────────────────────────────────────────────────────

function calcFim(horaInicio: string, duracaoMin: number) {
  const [h, m] = horaInicio.split(":").map(Number)
  const fimMin = h * 60 + m + duracaoMin
  return `${Math.floor(fimMin / 60).toString().padStart(2, "0")}:${(fimMin % 60).toString().padStart(2, "0")}`
}

export async function criarAgendamentoAdmin(dados: {
  quadraId:    string
  nomeCliente: string
  data:        string   // "YYYY-MM-DD"
  horaInicio:  string   // "HH:MM"
  duracaoMin:  number
  tipo:        "AVULSO" | "MENSALISTA"
  valor:       number
}) {
  await verificarAdmin()

  const horaFim   = calcFim(dados.horaInicio, dados.duracaoMin)
  const inicioStr = `${dados.data} ${dados.horaInicio}:00`
  const fimStr    = `${dados.data} ${horaFim}:00`

  await db.$executeRaw`
    INSERT INTO "Agendamento" (id, inicio, fim, status, tipo, "quadraId", observacao, valor, "criadoEm")
    VALUES (
      gen_random_uuid(),
      ${inicioStr}::timestamp,
      ${fimStr}::timestamp,
      'CONFIRMADO'::"StatusAgendamento",
      ${dados.tipo}::"TipoAgendamento",
      ${dados.quadraId},
      ${dados.nomeCliente},
      ${dados.valor}::decimal,
      NOW()
    )
  `

  revalidatePath("/dashboard/agendamentos")
}

export async function criarAgendamentosMensaisAdmin(dados: {
  quadraId:    string
  nomeCliente: string
  dataInicio:  string   // "YYYY-MM-DD"
  horaInicio:  string   // "HH:MM"
  duracaoMin:  number
  valor:       number
}) {
  await verificarAdmin()

  const horaFim = calcFim(dados.horaInicio, dados.duracaoMin)
  const inicio  = parseISO(dados.dataInicio)
  const fim     = endOfMonth(inicio)

  const datas: string[] = []
  let current = inicio
  while (!isAfter(current, fim)) {
    datas.push(format(current, "yyyy-MM-dd"))
    current = addWeeks(current, 1)
  }

  for (const data of datas) {
    const inicioStr = `${data} ${dados.horaInicio}:00`
    const fimStr    = `${data} ${horaFim}:00`

    await db.$executeRaw`
      INSERT INTO "Agendamento" (id, inicio, fim, status, tipo, "quadraId", observacao, valor, "criadoEm")
      VALUES (
        gen_random_uuid(),
        ${inicioStr}::timestamp,
        ${fimStr}::timestamp,
        'CONFIRMADO'::"StatusAgendamento",
        'MENSALISTA'::"TipoAgendamento",
        ${dados.quadraId},
        ${dados.nomeCliente},
        ${dados.valor}::decimal,
        NOW()
      )
    `
  }

  revalidatePath("/dashboard/agendamentos")
}
