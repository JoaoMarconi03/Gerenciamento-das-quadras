import { mp } from "@/lib/mercadopago"
import { Payment } from "mercadopago"
import { db } from "@/lib/db"
import { enviarMensagemWhatsApp } from "@/lib/whatsapp"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.type !== "payment" || !body.data?.id) {
      return Response.json({ ok: true })
    }

    const payment = new Payment(mp)
    const paymentData = await payment.get({ id: String(body.data.id) })

    if (paymentData.status !== "approved") {
      return Response.json({ ok: true })
    }

    const externalRef = paymentData.external_reference
    if (!externalRef) return Response.json({ ok: true })

    const dados = JSON.parse(externalRef) as {
      clienteId:  string
      quadraId:   string
      data:       string
      horaInicio: string
      horaFim:    string
      valorTotal: number
    }

    const inicioStr = `${dados.data} ${dados.horaInicio}:00`
    const fimStr    = `${dados.data} ${dados.horaFim}:00`

    // Evita duplicatas: verifica se já existe agendamento para esse horário/quadra
    const existente = await db.$queryRaw<[{ count: string }]>`
      SELECT COUNT(*)::text AS count FROM "Agendamento"
      WHERE "quadraId" = ${dados.quadraId}
        AND inicio = ${inicioStr}::timestamp
        AND status != 'CANCELADO'::"StatusAgendamento"
    `
    if (Number(existente[0].count) > 0) {
      return Response.json({ ok: true })
    }

    await db.$executeRaw`
      INSERT INTO "Agendamento" (id, inicio, fim, status, tipo, "quadraId", "clienteId", valor, observacao, "criadoEm")
      VALUES (
        gen_random_uuid(),
        ${inicioStr}::timestamp,
        ${fimStr}::timestamp,
        'CONFIRMADO'::"StatusAgendamento",
        'AVULSO'::"TipoAgendamento",
        ${dados.quadraId},
        ${dados.clienteId},
        ${dados.valorTotal},
        NULL,
        NOW()
      )
    `

    const adminTel = process.env.ADMIN_WHATSAPP
    if (adminTel) {
      const [cliente, quadra] = await Promise.all([
        db.cliente.findUnique({ where: { id: dados.clienteId }, select: { nome: true } }),
        db.quadra.findUnique({ where: { id: dados.quadraId },   select: { nome: true } }),
      ])
      const [ano, mes, dia] = dados.data.split("-")
      const mensagem =
        `✅ *Agendamento confirmado via pagamento!*\n\n` +
        `👤 Cliente: ${cliente?.nome ?? "Desconhecido"}\n` +
        `📅 Data: ${dia}/${mes}/${ano}\n` +
        `⏰ Horário: ${dados.horaInicio} – ${dados.horaFim}\n` +
        `🏐 Quadra: ${quadra?.nome ?? "—"}\n` +
        `💰 Valor total: R$ ${dados.valorTotal.toFixed(2).replace(".", ",")}\n` +
        `💳 Entrada paga: R$ ${(dados.valorTotal * 0.5).toFixed(2).replace(".", ",")}`
      await enviarMensagemWhatsApp(adminTel, mensagem).catch(() => {})
    }
  } catch (e) {
    console.error("Webhook MP erro:", e)
  }

  return Response.json({ ok: true })
}
