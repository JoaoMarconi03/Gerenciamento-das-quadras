import { Calendar, Users, ShoppingCart, BookOpen, TrendingUp, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export default async function DashboardPage() {
  const session = await auth()
  const tenantId = (session?.user as any)?.tenantId ?? ""

  const hoje = new Date()
  const dateKey = hoje.toISOString().slice(0, 10)
  const inicioDia = new Date(`${dateKey}T00:00:00`)
  const fimDia    = new Date(`${dateKey}T23:59:59`)

  // Agendamentos de hoje (não cancelados)
  const agendamentosHoje = await db.agendamento.findMany({
    where: {
      quadra: { tenantId },
      inicio: { gte: inicioDia, lte: fimDia },
      status: { not: "CANCELADO" },
    },
    include: { cliente: true },
    orderBy: { inicio: "asc" },
  })

  // Horários brutos via SQL (sem conversão de timezone)
  const agIds = agendamentosHoje.map((a) => a.id)
  const horariosRaw = agIds.length > 0
    ? await db.$queryRaw<Array<{ id: string; inicioHora: string; fimHora: string }>>`
        SELECT id,
          TO_CHAR(inicio, 'HH24:MI') AS "inicioHora",
          TO_CHAR(fim,    'HH24:MI') AS "fimHora"
        FROM "Agendamento"
        WHERE id = ANY(${agIds})
      `
    : []
  const horariosMap = Object.fromEntries(horariosRaw.map((h) => [h.id, h]))

  // Total de clientes
  const totalClientes = await db.cliente.count({ where: { tenantId } })

  // Faturamento hoje: soma dos valores confirmados
  const faturamento = agendamentosHoje
    .filter((a) => a.status === "CONFIRMADO" && a.valor != null)
    .reduce((sum, a) => sum + Number(a.valor), 0)

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

  const dataFormatada = hoje.toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  const stats = [
    {
      title: "Agendamentos Hoje",
      value: String(agendamentosHoje.length),
      sub: `${agendamentosHoje.filter((a) => a.status === "CONFIRMADO").length} confirmados`,
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
      title: "Clientes Ativos",
      value: String(totalClientes),
      sub: "cadastrados",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Fiado Pendente",
      value: fiadoPendente > 0 ? `R$ ${fiadoPendente.toFixed(2).replace(".", ",")}` : "R$ 0,00",
      sub: "em aberto",
      icon: BookOpen,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
    },
  ]

  return (
    <div className="p-4 lg:p-6 space-y-6">
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
          {agendamentosHoje.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum agendamento para hoje.
            </p>
          ) : (
            <div className="space-y-2">
              {agendamentosHoje.map((ag) => {
                const h = horariosMap[ag.id]
                const nome = ag.cliente?.nome ?? ag.observacao ?? "Avulso"
                const tipo = ag.tipo === "MENSALISTA" ? "Mensalista" : "Avulso"
                return (
                  <div
                    key={ag.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-1.5 text-primary shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-sm font-semibold w-10">{h?.inicioHora ?? "—"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{nome}</p>
                      <p className="text-xs text-muted-foreground">
                        até {h?.fimHora ?? "—"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        tipo === "Mensalista"
                          ? "border-primary/30 text-primary text-xs"
                          : "border-border text-muted-foreground text-xs"
                      }
                    >
                      {tipo}
                    </Badge>
                    {ag.valor != null && (
                      <span className="text-sm font-medium text-foreground shrink-0">
                        R$ {Number(ag.valor).toFixed(2).replace(".", ",")}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
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
                <BookOpen className="w-4 h-4 text-yellow-400" />
                Fiado — Contas em Aberto
              </CardTitle>
              <a href="/dashboard/fiado" className="text-xs text-primary hover:underline">Ver todas</a>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {fiadoPendente > 0 ? (
              <p className="text-sm text-yellow-400 font-semibold text-center py-6">
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
