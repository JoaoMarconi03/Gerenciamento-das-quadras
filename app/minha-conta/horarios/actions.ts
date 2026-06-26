"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { enviarMensagemWhatsApp } from "@/lib/whatsapp"
import { mp } from "@/lib/mercadopago"
import { Preference } from "mercadopago"

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

export async function criarPreferenciaPagamento(dados: {
  clienteId:  string
  quadraId:   string
  data:       string
  horaInicio: string
  horaFim:    string
  duracaoMin: number
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  const quadra = await db.quadra.findUnique({ where: { id: dados.quadraId } })
  if (!quadra) throw new Error("Quadra não encontrada")

  let valorTotal: number
  if (dados.duracaoMin === 60)       valorTotal = Number(quadra.valor1h   ?? 0)
  else if (dados.duracaoMin === 90)  valorTotal = Number(quadra.valor1h30 ?? 0)
  else                               valorTotal = Number(quadra.valor2h   ?? 0)

  if (valorTotal <= 0) throw new Error("Preço da quadra não configurado")

  const valorEntrada = Math.round(valorTotal * 0.5 * 100) / 100

  const [ano, mes, dia] = dados.data.split("-")
  const titulo = `${quadra.nome} — ${dia}/${mes}/${ano} ${dados.horaInicio}–${dados.horaFim}`

  const externalRef = JSON.stringify({
    clienteId:  dados.clienteId,
    quadraId:   dados.quadraId,
    data:       dados.data,
    horaInicio: dados.horaInicio,
    horaFim:    dados.horaFim,
    valorTotal,
  })

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? ""
  const preference = new Preference(mp)
  const result = await preference.create({
    body: {
      items: [{
        id:          dados.quadraId,
        title:       titulo,
        quantity:    1,
        unit_price:  valorEntrada,
        currency_id: "BRL",
      }],
      external_reference: externalRef,
      back_urls: {
        success: `${baseUrl}/minha-conta/horarios/sucesso`,
        failure: `${baseUrl}/minha-conta/horarios/falha`,
        pending: `${baseUrl}/minha-conta/horarios/sucesso`,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/pagamento/webhook`,
    },
  })

  if (!result.init_point) throw new Error("Erro ao criar preferência de pagamento")

  return {
    checkoutUrl: result.init_point,
    valorTotal,
    valorEntrada,
  }
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
