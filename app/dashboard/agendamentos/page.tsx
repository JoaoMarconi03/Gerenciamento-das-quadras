import { auth } from "@/auth"
import { db } from "@/lib/db"
import { PendentesAgendamentos } from "@/components/dashboard/pendentes-agendamentos"
import { CalendarioAgendamentos } from "@/components/dashboard/calendario-agendamentos"

export default async function AgendamentosPage() {
  const session = await auth()
  const tenantId = (session?.user as any)?.tenantId

  const pendentes = await db.agendamento.findMany({
    where: {
      status: "PENDENTE",
      quadra: { tenantId },
    },
    include: {
      cliente: true,
      quadra: true,
    },
    orderBy: { inicio: "asc" },
  })

  // Busca horários como strings literais para evitar conversão de timezone
  const ids = pendentes.map((p) => p.id)
  const horariosRaw = ids.length
    ? await db.$queryRaw<Array<{ id: string; inicioHora: string; fimHora: string; inicioData: string }>>`
        SELECT
          id,
          TO_CHAR(inicio, 'HH24:MI')    AS "inicioHora",
          TO_CHAR(fim,    'HH24:MI')    AS "fimHora",
          TO_CHAR(inicio, 'YYYY-MM-DD') AS "inicioData"
        FROM "Agendamento"
        WHERE id = ANY(${ids})
      `
    : []

  const horariosMap = Object.fromEntries(horariosRaw.map((h) => [h.id, h]))

  const pendentesSerializados = pendentes.map((p) => ({
    id: p.id,
    inicioHora:  horariosMap[p.id]?.inicioHora  ?? "--:--",
    fimHora:     horariosMap[p.id]?.fimHora     ?? "--:--",
    inicioData:  horariosMap[p.id]?.inicioData  ?? "",
    observacao:  p.observacao,
    clienteNome: p.cliente?.nome ?? null,
    quadraNome:  p.quadra.nome,
  }))

  const quadra = await db.quadra.findFirst({ where: { tenantId, ativa: true } })

  return (
    <div className="flex flex-col h-full">
      {pendentesSerializados.length > 0 && (
        <PendentesAgendamentos pendentes={pendentesSerializados} />
      )}
      <CalendarioAgendamentos
        quadraId={quadra?.id ?? ""}
        quadraNome={quadra?.nome ?? "Quadra"}
      />
    </div>
  )
}
