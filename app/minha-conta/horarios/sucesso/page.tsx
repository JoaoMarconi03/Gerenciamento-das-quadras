import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PagamentoSucessoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Reserva confirmada!</h1>
          <p className="text-muted-foreground text-sm">
            Pagamento aprovado. Seu horário está garantido.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/minha-conta">Ir para minha conta</Link>
        </Button>
      </div>
    </div>
  )
}
