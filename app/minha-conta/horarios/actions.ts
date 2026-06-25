"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { enviarMensagemWhatsApp } from "@/lib/whatsapp"

export async function buscarOcupacoes(
  quadraId: string,
  dataStr: string // "YYYY-MM-DD"
): Promise<{ inicio: string; fim: string }[]> {
  const session = await auth()
  if (!session?.user) return []

  const rows = await db.$queryRaw<Array<{ inicio: string; fim: string }>>`
    SELECT
      TO_CHAR(inicio, 'HH24:MI') AS inicio,
      TO_CHAR(fim,    'HH24:MI') AS fim
    FROM "Agendamento"
    WHERE "quadraId" = ${quadraId}
      AND status IN ('CONFIRMADO'::"StatusAgendamento", 'PENDENTE'::"StatusAgendamento")
      AND TO_CHAR(inicio, 'YYYY-MM-DD') = ${dataStr}
    ORDER BY inicio ASC
  `

  return rows
}

export async function criarReserva(dados: {
  clienteId:  string
  quadraId:   string
  data:       string
  horaInicio: string
  horaFim:    string
  observacao: string | null
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  const inicioStr = `${dados.data} ${dados.horaInicio}:00`
  const fimStr    = `${dados.data} ${dados.horaFim}:00`

  await db.$executeRaw`
    INSERT INTO "Agendamento" (id, inicio, fim, status, tipo, "quadraId", "clienteId", observacao, "criadoEm")
    VALUES (
      gen_random_uuid(),
      ${inicioStr}::timestamp,
      ${fimStr}::timestamp,
      'PENDENTE'::"StatusAgendamento",
      'AVULSO'::"TipoAgendamento",
      ${dados.quadraId},
      ${dados.clienteId},
      ${dados.observacao},
      NOW()
    )
  `

  revalidatePath("/minha-conta")
  revalidatePath("/minha-conta/horarios")

  const adminTel = process.env.ADMIN_WHATSAPP
  if (adminTel) {
    const [cliente, quadra] = await Promise.all([
      db.cliente.findUnique({ where: { id: dados.clienteId }, select: { nome: true } }),
      db.quadra.findUnique({ where: { id: dados.quadraId },   select: { nome: true } }),
    ])
    const [ano, mes, dia] = dados.data.split("-")
    const mensagem =
      `🏟️ *Novo agendamento pendente!*\n\n` +
      `👤 Cliente: ${cliente?.nome ?? "Desconhecido"}\n` +
      `📅 Data: ${dia}/${mes}/${ano}\n` +
      `⏰ Horário: ${dados.horaInicio} – ${dados.horaFim}\n` +
      `🏐 Quadra: ${quadra?.nome ?? "—"}\n\n` +
      `Acesse o painel para aprovar ou recusar.`
    await enviarMensagemWhatsApp(adminTel, mensagem).catch(() => {})
  }
}
