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

  const pendentesSerializados = pendentes.map((p) => ({
    id: p.id,
    inicio: p.inicio.toISOString(),
    fim: p.fim.toISOString(),
    observacao: p.observacao,
    clienteNome: p.cliente?.nome ?? null,
    quadraNome: p.quadra.nome,
  }))

  return (
    <div className="flex flex-col h-full">
      {pendentesSerializados.length > 0 && (
        <PendentesAgendamentos pendentes={pendentesSerializados} />
      )}
      <CalendarioAgendamentos />
    </div>
  )
}
