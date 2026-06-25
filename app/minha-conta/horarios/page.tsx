import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Trophy, ArrowLeft } from "lucide-react"
import { SignOutButton } from "@/components/sign-out-button"
import { db } from "@/lib/db"
import { HorariosCliente } from "@/components/horarios-cliente"

export default async function HorariosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const usuarioId = (session.user as any).id

  const cliente = await db.cliente.findUnique({ where: { usuarioId } })
  if (!cliente) redirect("/minha-conta")

  const quadra = await db.quadra.findFirst({
    where: { tenantId: cliente.tenantId, ativa: true },
  })
  if (!quadra) redirect("/minha-conta")

  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/minha-conta"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Minha conta
            </Link>
            <span className="text-border">|</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Trophy className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-bold">Brejão Arena</span>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-2">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground">Reservar horário</h1>
          <p className="text-sm text-muted-foreground">
            Escolha um horário disponível e selecione a duração.
          </p>
        </div>

        <HorariosCliente
          clienteId={cliente.id}
          quadraId={quadra.id}
          quadraNome={quadra.nome}
        />
      </main>
    </div>
  )
}
