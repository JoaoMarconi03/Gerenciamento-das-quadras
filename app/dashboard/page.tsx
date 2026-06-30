import { Calendar, ShoppingCart, BookOpen, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { AutoRefresh } from "@/components/auto-refresh"
import { AgendamentosHoje } from "@/components/dashboard/agendamentos-hoje"

export default async function DashboardPage() {
  const session = await auth()
  const tenantId = (session?.user as any)?.tenantId ?? ""

  // Pega IDs das quadras do tenant (mesmo padrão da página de agendamentos)
  const quadras = await db.quadra.findMany({ where: { tenantId }, select: { id: true } })
  const quadraIds = quadras.map((q) => q.id)

  // Agendamentos de hoje com TO_CHAR para evitar problema de timezone
  const agendamentosHoje = quadraIds.length > 0
    ? await db.$queryRaw<Array<{
        id: string
        inicioHora: string
        fimHora: string
        status: string
        tipo: string
        valor: string | null
        observacao: string | null
        clienteNome: string | null
        pagamentoRegistrado: boolean
        formaPagamento: string | null
      }>>`
        SELECT
          a.id,
          TO_CHAR(a.inicio, 'HH24:MI') AS "inicioHora",
          TO_CHAR(a.fim,    'HH24:MI') AS "fimHora",
          a.status::text,
          a.tipo::text,
          a.valor::text,
          a.observacao,
          c.nome AS "clienteNome",
          a."pagamentoRegistrado",
          a."formaPagamento"::text
        FROM "Agendamento" a
        LEFT JOIN "Cliente" c ON c.id = a."clienteId"
        WHERE a."quadraId" = ANY(${quadraIds})
          AND TO_CHAR(a.inicio, 'YYYY-MM-DD') = TO_CHAR(NOW(), 'YYYY-MM-DD')
          AND a.status != 'CANCELADO'::"StatusAgendamento"
        ORDER BY a.inicio ASC
      `
    : []

  // Faturamento hoje: soma dos valores confirmados ou pagos
  const faturamento = agendamentosHoje
    .filter((a) => (a.status === "CONFIRMADO" || a.status === "PAGO") && a.valor != null)
    .reduce((sum, a) => sum + Number(a.valor ?? 0), 0)

  // Fiado pendente: soma de todos os lançamentos - pagamentos do tenant
  const [somaLanc, somaPag] = await Promise.all([
    db.lancamentoFiado.aggregate({
      where: { conta: { cliente: { tenantId } } },
      _sum: { valor: true },
    }),
    db.pagamentoFiado.aggregate({
      where: { conta: { cliente: { tenantId } } },
      _sum: { valor: true },
    }),
  ])
  const fiadoPendente = Math.max(0,
    Number(somaLanc._sum.valor ?? 0) - Number(somaPag._sum.valor ?? 0)
  )

  const hoje = new Date()
  const dataFormatada = hoje.toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  const stats = [
    {
      title: "Agendamentos Hoje",
      value: String(agendamentosHoje.length),
      sub: `${agendamentosHoje.filter((a) => a.status === "CONFIRMADO" || a.status === "PAGO").length} confirmados`,
      icon: Calendar,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Faturamento Hoje",
      value: faturamento > 0 ? `R$ ${faturamento.toFixed(2).replace(".", ",")}` : "R$ 0,00",
      sub: "agendamentos confirmados",
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Fiado Pendente",
      value: fiadoPendente > 0 ? `R$ ${fiadoPendente.toFixed(2).replace(".", ",")}` : "R$ 0,00",
      sub: "em aberto",
      icon: BookOpen,
      color: "text-yellow-600",
      bg: "bg-yellow-500/10",
    },
  ]

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <AutoRefresh segundos={5} />
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5 capitalize">{dataFormatada}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.title} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground leading-tight">{s.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-tight">{s.sub}</p>
                </div>
                <div className={`${s.bg} p-2 rounded-lg shrink-0 ml-2`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Próximos agendamentos */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">
              Agendamentos de Hoje
            </CardTitle>
            <a href="/dashboard/agendamentos" className="text-xs text-primary hover:underline">
              Ver calendário
            </a>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <AgendamentosHoje agendamentos={agendamentosHoje} />
        </CardContent>
      </Card>

      {/* Bar + Fiado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                Bar — Vendas Hoje
              </CardTitle>
              <a href="/dashboard/bar" className="text-xs text-primary hover:underline">Gerenciar</a>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma venda registrada hoje.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-yellow-600" />
                Fiado — Contas em Aberto
              </CardTitle>
              <a href="/dashboard/fiado" className="text-xs text-primary hover:underline">Ver todas</a>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {fiadoPendente > 0 ? (
              <p className="text-sm text-yellow-600 font-semibold text-center py-6">
                R$ {fiadoPendente.toFixed(2).replace(".", ",")} em aberto
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma conta em aberto.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
