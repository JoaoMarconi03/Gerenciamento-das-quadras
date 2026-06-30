import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Trophy, CalendarDays, Clock, User, CalendarPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SignOutButton } from "@/components/sign-out-button"
import { db } from "@/lib/db"
import { AutoRefresh } from "@/components/auto-refresh"

const STATUS_STYLES: Record<string, string> = {
  CONFIRMADO: "bg-primary/10 text-primary",
  PENDENTE:   "bg-yellow-500/15 text-yellow-600",
  CANCELADO:  "bg-destructive/15 text-destructive",
  CONCLUIDO:  "bg-muted text-muted-foreground",
}

const STATUS_LABEL: Record<string, string> = {
  CONFIRMADO: "Confirmado",
  PENDENTE:   "Pendente",
  CANCELADO:  "Cancelado",
  CONCLUIDO:  "Concluído",
}

export default async function MinhaContaPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const usuarioId = (session.user as any).id
  const nome = session.user.name ?? "Cliente"

  // Busca o cliente vinculado ao usuário logado e seus agendamentos
  const cliente = await db.cliente.findUnique({
    where: { usuarioId },
    include: {
      agendamentos: {
        include: { quadra: true },
        orderBy: { inicio: "asc" },
      },
    },
  })

  const agendamentos = cliente?.agendamentos ?? []

  // Busca horários como strings literais do banco (sem conversão de timezone)
  const clienteId = cliente?.id
  const horariosRaw = clienteId
    ? await db.$queryRaw<Array<{ id: string; inicioHora: string; fimHora: string; inicioData: string }>>`
        SELECT
          id,
          TO_CHAR(inicio, 'HH24:MI')   AS "inicioHora",
          TO_CHAR(fim,    'HH24:MI')   AS "fimHora",
          TO_CHAR(inicio, 'YYYY-MM-DD') AS "inicioData"
        FROM "Agendamento"
        WHERE "clienteId" = ${clienteId}
      `
    : []

  const horariosMap = Object.fromEntries(horariosRaw.map((h) => [h.id, h]))

  // Próximo jogo: compara apenas pela data (string "YYYY-MM-DD")
  const hoje = new Date().toISOString().slice(0, 10)
  const proximoJogo = agendamentos.find((a) => {
    const h = horariosMap[a.id]
    return h && h.inicioData >= hoje && a.status !== "CANCELADO"
  })

  const totalAtivos = agendamentos.filter((a) => a.status !== "CANCELADO").length

  const iniciais = nome
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  function formatData(ag: (typeof agendamentos)[0]) {
    const h = horariosMap[ag.id]
    if (!h) return "—"
    const [y, mo, d] = h.inicioData.split("-").map(Number)
    return new Date(y, mo - 1, d).toLocaleDateString("pt-BR", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
    })
  }

  function formatHorario(ag: (typeof agendamentos)[0]) {
    const h = horariosMap[ag.id]
    return h ? `${h.inicioHora} – ${h.fimHora}` : "—"
  }

  function formatProximo() {
    if (!proximoJogo) return "—"
    const h = horariosMap[proximoJogo.id]
    if (!h) return "—"
    const [y, mo, d] = h.inicioData.split("-").map(Number)
    return new Date(y, mo - 1, d).toLocaleDateString("pt-BR", {
      weekday: "short", day: "2-digit", month: "short",
    })
  }

  return (
    <div className="min-h-screen text-foreground">
      <AutoRefresh segundos={5} />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Brejão Arena</span>
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Boas-vindas */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
            {iniciais}
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Bem-vindo,</p>
            <h1 className="text-2xl font-bold">{nome}</h1>
          </div>
        </div>

        {/* Cards rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Agendamentos</p>
            <p className="text-lg font-bold mt-0.5">{totalAtivos}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Próximo jogo</p>
            <p className="text-lg font-bold mt-0.5">
              {formatProximo()}
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 col-span-2 sm:col-span-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <User className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Conta</p>
            <p className="text-lg font-bold mt-0.5">Ativa</p>
          </div>
        </div>

        {/* CTA — Reservar horário */}
        <Link
          href="/minha-conta/horarios"
          className="flex items-center justify-between gap-4 bg-primary text-primary-foreground rounded-xl px-5 py-4 hover:bg-primary/90 transition-colors"
        >
          <div className="flex items-center gap-3">
            <CalendarPlus className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-bold text-base leading-tight">Ver horários disponíveis</p>
              <p className="text-xs opacity-75 mt-0.5">Escolha o dia e horário para reservar</p>
            </div>
          </div>
          <span className="text-2xl opacity-70">›</span>
        </Link>

        {/* Meus agendamentos */}
        <div>
          <h2 className="text-xl font-bold mb-4">Meus agendamentos</h2>
          <div className="space-y-3">
            {agendamentos.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
                Nenhum agendamento ainda. Entre em contato com a arena para agendar.
              </div>
            ) : (
              agendamentos.map((ag) => (
                <div
                  key={ag.id}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CalendarDays className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm capitalize">{formatData(ag)}</p>
                        <Badge
                          variant="secondary"
                          className={`text-xs border-0 shrink-0 ${STATUS_STYLES[ag.status] ?? ""}`}
                        >
                          {STATUS_LABEL[ag.status] ?? ag.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatHorario(ag)}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">{ag.quadra.nome}</p>
                        {ag.valor != null && (
                          <span className="text-sm font-semibold text-primary">
                            R$ {Number(ag.valor).toFixed(2).replace(".", ",")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
