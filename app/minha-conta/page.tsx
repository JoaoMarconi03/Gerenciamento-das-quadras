import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Trophy, CalendarDays, Clock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SignOutButton } from "@/components/sign-out-button"
import { db } from "@/lib/db"

const STATUS_STYLES: Record<string, string> = {
  CONFIRMADO: "bg-primary/10 text-primary",
  PENDENTE:   "bg-yellow-500/15 text-yellow-400",
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

  // Próximo jogo: futuro com status não cancelado
  const agora = new Date()
  const proximoJogo = agendamentos.find(
    (a) => a.inicio > agora && a.status !== "CANCELADO"
  )

  // Contagem de agendamentos ativos (não cancelados)
  const totalAtivos = agendamentos.filter((a) => a.status !== "CANCELADO").length

  const iniciais = nome
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  function formatData(date: Date) {
    return date.toLocaleDateString("pt-BR", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
    })
  }

  function formatHorario(inicio: Date, fim: Date) {
    const h = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    return `${h(inicio)} – ${h(fim)}`
  }

  function formatProximo(date: Date) {
    return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
              {proximoJogo ? formatProximo(proximoJogo.inicio) : "—"}
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

        {/* Botão de novo agendamento */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Quer jogar?</p>
            <p className="text-sm text-muted-foreground">Reserve seu horário na quadra agora mesmo.</p>
          </div>
          <Button asChild>
            <Link href="/minha-conta/horarios">Ver horários disponíveis</Link>
          </Button>
        </div>

        {/* Meus agendamentos */}
        <div>
          <h2 className="text-xl font-bold mb-4">Meus agendamentos</h2>
          <div className="space-y-3">
            {agendamentos.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
                Nenhum agendamento ainda. Que tal reservar um horário?
              </div>
            ) : (
              agendamentos.map((ag) => (
                <div
                  key={ag.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{formatData(ag.inicio)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatHorario(ag.inicio, ag.fim)} • {ag.quadra.nome}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {ag.valor != null && (
                      <span className="text-sm font-semibold text-primary">
                        R$ {Number(ag.valor).toFixed(2).replace(".", ",")}
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className={`text-xs border-0 ${STATUS_STYLES[ag.status] ?? ""}`}
                    >
                      {STATUS_LABEL[ag.status] ?? ag.status}
                    </Badge>
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
