import Link from "next/link"
import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PagamentoFalhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Pagamento não concluído</h1>
          <p className="text-muted-foreground text-sm">
            O pagamento foi cancelado ou recusado. Nenhuma reserva foi criada.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/minha-conta/horarios">Tentar novamente</Link>
        </Button>
      </div>
    </div>
  )
}
