import Link from "next/link"
import { Trophy, Clock, MapPin, Star, ChevronRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DiasStrip } from "@/components/dias-strip"
import { HorariosSection } from "@/components/horarios-section"

const PRECOS = [
  { duracao: "1 hora", semana: "R$ 120", fimSemana: "R$ 150" },
  { duracao: "1h30", semana: "R$ 170", fimSemana: "R$ 210" },
  { duracao: "2 horas", semana: "R$ 220", fimSemana: "R$ 270" },
]


export default function HomePage() {

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Brejão Arena</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/registro">Cadastrar</Link>
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
        <Badge variant="outline" className="mb-4 text-primary border-primary/40">
          Aberto todos os dias • 08h–23h
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          A sua quadra em{" "}
          <span className="text-primary">Brejão</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
          Agende seu horário de forma rápida e simples. Veja a disponibilidade em tempo real e garanta
          seu jogo.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" asChild>
            <Link href="/registro">
              Agendar agora
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#horarios">Ver horários</Link>
          </Button>
        </div>
      </section>

      {/* Info rápida */}
      <section className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Clock, titulo: "Horário de funcionamento", desc: "Segunda a domingo, das 08h às 23h" },
          { icon: MapPin, titulo: "Localização", desc: "Brejão — arena society gramado sintético" },
          { icon: Star, titulo: "Mensalistas", desc: "Planos mensais com horário fixo garantido" },
        ].map(({ icon: Icon, titulo, desc }) => (
          <div key={titulo} className="bg-card border border-border rounded-xl p-5 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{titulo}</p>
              <p className="text-muted-foreground text-sm mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Horários */}
      <section id="horarios" className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold">Disponibilidade</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-6">Selecione a duração desejada e veja os horários disponíveis.</p>

        <DiasStrip />
        <HorariosSection />
      </section>

      {/* Preços */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-6">Preços</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-3 text-xs text-muted-foreground font-semibold px-5 py-3 border-b border-border bg-muted/30">
            <span>Duração</span>
            <span className="text-center">Seg – Sex</span>
            <span className="text-center">Sáb – Dom</span>
          </div>
          {PRECOS.map((p) => (
            <div key={p.duracao} className="grid grid-cols-3 px-5 py-4 border-b border-border last:border-0">
              <span className="font-medium text-sm">{p.duracao}</span>
              <span className="text-center text-sm text-primary font-semibold">{p.semana}</span>
              <span className="text-center text-sm text-primary font-semibold">{p.fimSemana}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          * Valores sujeitos a alteração. Consulte o administrador para promoções e planos mensais.
        </p>
      </section>

      {/* CTA final */}
      <section
        className="py-16 px-4 text-center"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, oklch(0.627 0.194 142.5 / 0.12) 0%, transparent 70%)",
        }}
      >
        <h2 className="text-3xl font-bold mb-3">Pronto para jogar?</h2>
        <p className="text-muted-foreground mb-8">Cadastre-se gratuitamente e agende em menos de 1 minuto.</p>
        <Button size="lg" asChild>
          <Link href="/registro">Criar conta gratuita</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>© 2025 Brejão Arena. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
