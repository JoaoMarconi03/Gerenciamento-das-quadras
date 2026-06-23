"use client"

import { useState } from "react"
import Link from "next/link"
import { Lock, CheckCircle2, Clock, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

const BLOCOS_OCUPADOS = [
  { inicio: "10:00", duracaoMin: 60 },
  { inicio: "14:00", duracaoMin: 120 },
  { inicio: "19:00", duracaoMin: 90 },
]

const DURACOES = [
  { label: "1 hora",   min: 60  },
  { label: "1h30",     min: 90  },
  { label: "2 horas",  min: 120 },
  { label: "2h30",     min: 150 },
  { label: "3 horas",  min: 180 },
]

function toMin(hora: string) {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

function toStr(min: number) {
  return `${Math.floor(min / 60).toString().padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`
}

type BlocoLivre   = { tipo: "livre";   inicio: string; fim: string; duracaoMin: number }
type BlocoOcupado = { tipo: "ocupado"; inicio: string; fim: string }
type Bloco = BlocoLivre | BlocoOcupado

function buildTimeline(): Bloco[] {
  const blocos: Bloco[] = []
  let current = 8 * 60
  const end = 23 * 60

  const sorted = [...BLOCOS_OCUPADOS].sort((a, b) => toMin(a.inicio) - toMin(b.inicio))

  for (const ocupado of sorted) {
    const bStart = toMin(ocupado.inicio)
    const bEnd = bStart + ocupado.duracaoMin

    if (current < bStart) {
      blocos.push({ tipo: "livre", inicio: toStr(current), fim: toStr(bStart), duracaoMin: bStart - current })
    }

    blocos.push({ tipo: "ocupado", inicio: toStr(bStart), fim: toStr(bEnd) })
    current = bEnd
  }

  if (current < end) {
    blocos.push({ tipo: "livre", inicio: toStr(current), fim: toStr(end), duracaoMin: end - current })
  }

  return blocos
}

function formatDuracao(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (m === 0) return `${h}h`
  return `${h}h${m.toString().padStart(2, "0")}`
}

export function HorariosSection() {
  const [duracaoMin, setDuracaoMin] = useState(60)
  const timeline = buildTimeline()

  return (
    <div>
      {/* Seletor de duração */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Qual duração você deseja?
        </p>
        <div className="flex flex-wrap gap-2">
          {DURACOES.map((d) => (
            <button
              key={d.min}
              onClick={() => setDuracaoMin(d.min)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                duracaoMin === d.min
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-secondary text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Mostrando horários disponíveis para <span className="text-primary font-semibold">{DURACOES.find(d => d.min === duracaoMin)?.label}</span> — janelas menores aparecem indisponíveis.
        </p>
      </div>

      {/* Timeline */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="font-semibold text-sm">Quadra Principal</p>
          <span className="text-xs text-muted-foreground">08:00 – 23:00</span>
        </div>

        <div className="divide-y divide-border">
          {timeline.map((bloco) => {
            if (bloco.tipo === "ocupado") {
              return (
                <div key={bloco.inicio} className="flex items-center gap-4 px-5 py-4 bg-destructive/5">
                  <div className="w-1 h-9 rounded-full shrink-0 bg-destructive/60" />
                  <div className="flex items-center gap-1.5 font-mono font-bold text-base min-w-[150px]">
                    <span>{bloco.inicio}</span>
                    <span className="text-muted-foreground font-normal text-sm">→</span>
                    <span>{bloco.fim}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <Lock className="w-3.5 h-3.5 text-destructive/70" />
                    <span className="text-sm font-semibold text-destructive/80">Ocupado</span>
                  </div>
                </div>
              )
            }

            const cabe = bloco.duracaoMin >= duracaoMin
            const totalLabel = formatDuracao(bloco.duracaoMin)

            return (
              <div
                key={bloco.inicio}
                className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                  cabe ? "hover:bg-primary/5" : "opacity-40"
                }`}
              >
                <div className={`w-1 h-9 rounded-full shrink-0 ${cabe ? "bg-primary/70" : "bg-muted-foreground/30"}`} />
                <div className="flex flex-col min-w-[150px]">
                  <div className="flex items-center gap-1.5 font-mono font-bold text-base">
                    <span>{bloco.inicio}</span>
                    <span className="text-muted-foreground font-normal text-sm">→</span>
                    <span>{bloco.fim}</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5">{totalLabel} disponíveis</span>
                </div>

                <div className="flex-1">
                  {cabe ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">Disponível</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-muted-foreground/50" />
                      <span className="text-sm text-muted-foreground">
                        Janela pequena demais
                      </span>
                    </div>
                  )}
                </div>

                {cabe && (
                  <Button size="sm" asChild className="shrink-0">
                    <Link href="/registro">Reservar</Link>
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Para reservar,{" "}
        <Link href="/registro" className="text-primary hover:underline">
          crie sua conta gratuitamente
        </Link>
        .
      </p>
    </div>
  )
}
