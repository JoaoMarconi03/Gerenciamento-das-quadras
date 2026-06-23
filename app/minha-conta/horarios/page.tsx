import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Trophy, ArrowLeft } from "lucide-react"
import { SignOutButton } from "@/components/sign-out-button"
import { HorariosCliente } from "@/components/horarios-cliente"
import { db } from "@/lib/db"

export default async function HorariosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const usuarioId = (session.user as any).id
  const tenantId  = (session.user as any).tenantId
  const nome      = session.user.name ?? "Cliente"

  const [cliente, quadra] = await Promise.all([
    db.cliente.findUnique({ where: { usuarioId } }),
    db.quadra.findFirst({ where: { tenantId, ativa: true } }),
  ])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/minha-conta" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
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

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Horários disponíveis</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Escolha a duração, selecione o dia e clique em Reservar.
          </p>
        </div>

        {!cliente || !quadra ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
            Não foi possível carregar os dados. Fale com o administrador.
          </div>
        ) : (
          <HorariosCliente
            nomeCliente={nome}
            clienteId={cliente.id}
            quadraId={quadra.id}
            quadraNome={quadra.nome}
          />
        )}
      </main>
    </div>
  )
}
