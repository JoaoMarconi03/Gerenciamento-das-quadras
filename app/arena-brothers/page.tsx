import Link from "next/link"
import { Trophy, Clock, MapPin, Star, CalendarDays, MessageCircle } from "lucide-react"
import { HorariosPublico } from "@/components/horarios-publico"
import { buscarTenantPublico } from "@/app/actions"

export default async function ArenaBrothersPage() {
  const tenant   = await buscarTenantPublico("arena-brothers")
  const quadra   = tenant?.quadras[0] ?? null
  const whatsapp = tenant?.whatsapp ?? ""

  return (
    <div className="min-h-screen" style={{ background: "#ffffff", color: "#1e293b" }}>

      {/* Navbar */}
      <header className="sticky top-0 z-50" style={{ background: "#1d4ed8", borderBottom: "1px solid #1e40af" }}>
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "#facc15" }}
            >
              <Trophy className="w-4 h-4" style={{ color: "#1d4ed8" }} />
            </div>
            <span className="font-bold text-lg text-white">Arena Brothers</span>
          </div>
          <Link
            href="/arena-brothers/login"
            className="text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
            style={{ color: "#facc15" }}
          >
            Área admin
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className="py-24 px-4 text-center"
        style={{
          background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #1d4ed8 100%)",
        }}
      >
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-white">
          Bem-vindo à{" "}
          <span style={{ color: "#facc15" }}>Arena Brothers</span>
        </h1>
        <p className="text-blue-100 text-lg max-w-xl mx-auto mb-10">
          Veja a disponibilidade em tempo real e reserve direto pelo WhatsApp — rápido e sem cadastro.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Olá! Gostaria de reservar uma quadra.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ background: "#facc15", color: "#1d4ed8" }}
            >
              <MessageCircle className="w-4 h-4" />
              Reservar via WhatsApp
            </a>
          ) : null}
          <a
            href="#horarios"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border-2 text-white transition-all hover:bg-white/10"
            style={{ borderColor: "#facc15", color: "#facc15" }}
          >
            Ver horários
          </a>
        </div>
      </section>

      {/* Faixa amarela decorativa */}
      <div style={{ height: "6px", background: "#facc15" }} />

      {/* Info rápida */}
      <section className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="rounded-xl p-5 flex gap-4 items-start border"
          style={{ background: "#f0f7ff", borderColor: "#bfdbfe" }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#dbeafe" }}
          >
            <Clock className="w-5 h-5" style={{ color: "#1d4ed8" }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "#1e293b" }}>Horário de funcionamento</p>
            {quadra ? (
              <div className="text-sm mt-0.5 space-y-0.5" style={{ color: "#64748b" }}>
                <p>Seg–Sex: {quadra.horaAbertura} – {quadra.horaFechamento}</p>
                <p>Sáb–Dom: {quadra.horaAberturaFds ?? "08:00"} – {quadra.horaFechamentoFds ?? "22:00"}</p>
              </div>
            ) : (
              <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>Consulte disponibilidade</p>
            )}
          </div>
        </div>

        {[
          { icon: MapPin, titulo: "Localização",  desc: "Arena Brothers — quadra society" },
          { icon: Star,   titulo: "Mensalistas",  desc: "Planos mensais com horário fixo garantido" },
        ].map(({ icon: Icon, titulo, desc }) => (
          <div
            key={titulo}
            className="rounded-xl p-5 flex gap-4 items-start border"
            style={{ background: "#f0f7ff", borderColor: "#bfdbfe" }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "#dbeafe" }}
            >
              <Icon className="w-5 h-5" style={{ color: "#1d4ed8" }} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: "#1e293b" }}>{titulo}</p>
              <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>{desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Preços */}
      {quadra && (quadra.valor1h || quadra.valor1h30 || quadra.valor2h) && (
        <section className="max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "#1e293b" }}>
            Preços —{" "}
            <span style={{ color: "#1d4ed8" }}>{quadra.nome}</span>
          </h2>
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#bfdbfe" }}>
            {[
              { label: "1 hora",   valor: quadra.valor1h   },
              { label: "1h 30min", valor: quadra.valor1h30 },
              { label: "2 horas",  valor: quadra.valor2h   },
            ].filter((p) => p.valor).map((p, i, arr) => (
              <div
                key={p.label}
                className="flex items-center justify-between px-5 py-4"
                style={{
                  borderBottom: i < arr.length - 1 ? "1px solid #bfdbfe" : "none",
                  background: i % 2 === 0 ? "#f0f7ff" : "#ffffff",
                }}
              >
                <span className="font-medium text-sm" style={{ color: "#1e293b" }}>{p.label}</span>
                <span className="font-bold text-base" style={{ color: "#1d4ed8" }}>
                  R$ {p.valor!.toFixed(2).replace(".", ",")}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: "#94a3b8" }}>
            * Valores sujeitos a alteração. Consulte para promoções e planos mensais.
          </p>
        </section>
      )}

      {/* Horários */}
      <section id="horarios" className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-5 h-5" style={{ color: "#1d4ed8" }} />
          <h2 className="text-2xl font-bold" style={{ color: "#1e293b" }}>Disponibilidade</h2>
        </div>
        <p className="text-sm mb-6" style={{ color: "#64748b" }}>
          Veja os horários disponíveis e reserve direto pelo WhatsApp.
        </p>
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
          style={{ background: "#1d4ed8" }}
        >
          {/* faixa amarela no topo do CTA */}
          <div
            className="w-16 h-1.5 rounded-full mx-auto mb-6"
            style={{ background: "#facc15" }}
          />
          <h2 className="text-3xl font-bold mb-3 text-white">Pronto para jogar?</h2>
          <p className="mb-8 text-blue-200">Reserva rápida sem cadastro — só mandar mensagem.</p>
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Olá! Gostaria de reservar uma quadra.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#facc15", color: "#1d4ed8" }}
          >
            <MessageCircle className="w-4 h-4" />
            Falar no WhatsApp
          </a>
        </section>
      )}

      <footer
        className="py-6 text-center text-xs"
        style={{ background: "#1e40af", color: "#93c5fd" }}
      >
        <p>© 2025 Arena Brothers. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
