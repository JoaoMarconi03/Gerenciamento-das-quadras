import { db } from "@/lib/db"
import { auth } from "@/auth"
import { QuadraCard } from "./quadra-card"

export default async function QuadrasPage() {
  const session = await auth()
  const user = await db.usuario.findUnique({ where: { email: session?.user?.email! } })
  const tenantId = user?.tenantId ?? ""

  const q = await db.quadra.findFirst({ where: { tenantId } })

  const quadra = q
    ? {
        ...q,
        valor1h:   q.valor1h   ? Number(q.valor1h)   : null,
        valor1h30: q.valor1h30 ? Number(q.valor1h30) : null,
        valor2h:   q.valor2h   ? Number(q.valor2h)   : null,
      }
    : null

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Quadras</h1>
        <p className="text-sm text-muted-foreground">Gestão das quadras da arena</p>
      </div>

      {quadra ? (
        <QuadraCard quadra={quadra} />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-10">
          Nenhuma quadra cadastrada. Entre em contato com o suporte.
        </p>
      )}
    </div>
  )
}
