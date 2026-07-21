import Link from "next/link"
import { Trophy, Clock, MapPin, Star, CalendarDays, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HorariosPublico } from "@/components/horarios-publico"
import { buscarTenantPublico } from "@/app/actions"

export default async function ArenaBrejaoPage() {
  const tenant   = await buscarTenantPublico("brejao-arena")
  const quadra   = tenant?.quadras[0] ?? null
  const whatsapp = tenant?.whatsapp ?? ""

  return (
    <div className="min-h-screen text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Brejão Arena</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Área admin</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section
        className="py-20 px-4 text-center"
        style={{ background: "radial-gradient(ellipse at 50% 0%, oklch(0.627 0.194 142.5 / 0.18) 0%, transparent 70%)" }}
      >
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          A sua quadra em <span className="text-primary">Brejão</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
          Veja a disponibilidade em tempo real e reserve direto pelo WhatsApp — rápido e sem cadastro.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {whatsapp ? (
            <Button size="lg" asChild>
              <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Olá! Gostaria de reservar uma quadra.")}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" />
                Reservar via WhatsApp
              </a>
            </Button>
          ) : null}
          <Button size="lg" variant="outline" asChild>
            <Link href="#horarios">Ver horários</Link>
          </Button>
        </div>
      </section>

      {/* Info rápida */}
      <section className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 flex gap-4 items-start">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Horário de funcionamento</p>
            {quadra ? (
              <div className="text-muted-foreground text-sm mt-0.5 space-y-0.5">
                <p>Seg–Sex: {quadra.horaAbertura} – {quadra.horaFechamento}</p>
                <p>Sáb–Dom: {quadra.horaAberturaFds ?? "08:00"} – {quadra.horaFechamentoFds ?? "22:00"}</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm mt-0.5">Consulte disponibilidade</p>
            )}
          </div>
        </div>
        {[
          { icon: MapPin, titulo: "Localização",  desc: "Brejão — arena society gramado sintético" },
          { icon: Star,   titulo: "Mensalistas",  desc: "Planos mensais com horário fixo garantido" },
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

      {/* Preços */}
      {quadra && (quadra.valor1h || quadra.valor1h30 || quadra.valor2h) && (
        <section className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-bold mb-6">Preços — {quadra.nome}</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {[
              { label: "1 hora",   valor: quadra.valor1h   },
              { label: "1h 30min", valor: quadra.valor1h30 },
              { label: "2 horas",  valor: quadra.valor2h   },
            ].filter((p) => p.valor).map((p) => (
              <div key={p.label} className="flex items-center justify-between px-5 py-4 border-b border-border last:border-0">
                <span className="font-medium text-sm">{p.label}</span>
                <span className="text-primary font-bold">R$ {p.valor!.toFixed(2).replace(".", ",")}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">* Valores sujeitos a alteração. Consulte para promoções e planos mensais.</p>
        </section>
      )}

      {/* Horários */}
      <section id="horarios" className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold">Disponibilidade</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-6">Veja os horários disponíveis e reserve direto pelo WhatsApp.</p>
        <HorariosPublico
          quadraId={quadra?.id ?? ""}
          quadraNome={quadra?.nome ?? "Quadra"}
          valor1h={quadra?.valor1h ?? null}
          valor1h30={quadra?.valor1h30 ?? null}
          valor2h={quadra?.valor2h ?? null}
          horaAbertura={quadra?.horaAbertura ?? "08:00"}
          horaFechamento={quadra?.horaFechamento ?? "23:00"}
          horaAberturaFds={quadra?.horaAberturaFds ?? "08:00"}
          horaFechamentoFds={quadra?.horaFechamentoFds ?? "22:00"}
          whatsapp={whatsapp}
        />
      </section>

      {/* CTA final */}
      {whatsapp && (
        <section
          className="py-16 px-4 text-center"
          style={{ background: "radial-gradient(ellipse at 50% 100%, oklch(0.627 0.194 142.5 / 0.12) 0%, transparent 70%)" }}
        >
          <h2 className="text-3xl font-bold mb-3">Pronto para jogar?</h2>
          <p className="text-muted-foreground mb-8">Reserva rápida sem cadastro — só mandar mensagem.</p>
          <Button size="lg" asChild>
            <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Olá! Gostaria de reservar uma quadra.")}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4 mr-2" />
              Falar no WhatsApp
            </a>
          </Button>
        </section>
      )}

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>© 2025 Brejão Arena. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
