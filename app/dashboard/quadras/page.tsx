import { buscarQuadra } from "./actions"
import { QuadraCard } from "./quadra-card"
import { CriarQuadraCard } from "./criar-quadra-card"

export default async function QuadrasPage() {
  const quadra = await buscarQuadra()

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Quadras</h1>
        <p className="text-sm text-muted-foreground">Gestão das quadras da arena</p>
      </div>

      {quadra ? <QuadraCard quadra={quadra} /> : <CriarQuadraCard />}
    </div>
  )
}
