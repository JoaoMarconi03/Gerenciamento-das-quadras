import Link from "next/link"
import { Trophy, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ArenaVotocelPage() {
  return (
    <div className="min-h-screen text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Arena Votocel</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login?arena=arena-votocel">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/registro?arena=arena-votocel">Cadastrar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="py-20 px-4 text-center"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, oklch(0.627 0.194 142.5 / 0.18) 0%, transparent 70%)",
        }}
      >
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Bem-vindo à{" "}
          <span className="text-primary">Arena Votocel</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
          Agende seu horário de forma rápida e simples. Garanta seu jogo com facilidade.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" asChild>
            <Link href="/registro?arena=arena-votocel">
              Criar conta
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login?arena=arena-votocel">Entrar</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>© 2025 Arena Votocel. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
