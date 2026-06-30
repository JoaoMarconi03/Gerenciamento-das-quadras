import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, DollarSign } from "lucide-react"
import { PagamentosLista } from "@/components/dashboard/pagamentos-lista"

export default async function PagamentosPage() {
  const session = await auth()
  const tenantId = (session?.user as any)?.tenantId ?? ""

  const quadras = await db.quadra.findMany({ where: { tenantId }, select: { id: true } })
  const quadraIds = quadras.map((q) => q.id)

  type Row = {
    id: string
    inicioHora: string
    fimHora: string
    dataFormatada: string
    dataISO: string
    tipo: string
    valor: string | null
    observacao: string | null
    clienteNome: string | null
    pagamentoRegistradoEm: string | null
    quadraNome: string
  }

  const pagamentos = quadraIds.length > 0
    ? await db.$queryRaw<Row[]>`
        SELECT
          a.id,
          TO_CHAR(a.inicio, 'HH24:MI')    AS "inicioHora",
          TO_CHAR(a.fim,    'HH24:MI')    AS "fimHora",
          TO_CHAR(a.inicio, 'DD/MM/YYYY') AS "dataFormatada",
          TO_CHAR(a.inicio, 'YYYY-MM-DD') AS "dataISO",
          a.tipo::text,
          a.valor::text,
          a.observacao,
          c.nome AS "clienteNome",
          TO_CHAR(a."pagamentoRegistradoEm", 'DD/MM/YYYY HH24:MI') AS "pagamentoRegistradoEm",
          q.nome AS "quadraNome"
        FROM "Agendamento" a
        JOIN "Quadra" q ON a."quadraId" = q.id
        LEFT JOIN "Cliente" c ON a."clienteId" = c.id
        WHERE a."quadraId" = ANY(${quadraIds})
          AND a.status = 'PAGO'::"StatusAgendamento"
        ORDER BY a."pagamentoRegistradoEm" DESC NULLS LAST
      `
    : []

  const totalRecebido = pagamentos.reduce((sum, p) => sum + Number(p.valor ?? 0), 0)

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Pagamentos Registrados</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Histórico de pagamentos confirmados manualmente
        </p>
      </div>

      {/* Totalizador */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-500/10 p-2.5 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total recebido (todos os períodos)</p>
              <p className="text-2xl font-bold text-foreground">
                R$ {totalRecebido.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-xs text-muted-foreground">{pagamentos.length} pagamento(s) registrado(s)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Agendamentos Pagos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <PagamentosLista pagamentos={pagamentos} />
        </CardContent>
      </Card>
    </div>
  )
}
