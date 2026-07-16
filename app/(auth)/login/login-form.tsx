"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Trophy } from "lucide-react"

type LoginTema = {
  panelBg: string
  glow1: string
  glow2: string
  iconBg: string
  iconColor: string
  inputFocus: string
  btnBg: string
  btnHover: string
  btnColor: string
}

const TEMA_VERDE: LoginTema = {
  panelBg:    "linear-gradient(145deg, #0a0a0a 0%, #071207 50%, #0d1f0d 100%)",
  glow1:      "rgba(34,197,94,0.12)",
  glow2:      "rgba(22,163,74,0.08)",
  iconBg:     "#16a34a",
  iconColor:  "#ffffff",
  inputFocus: "#16a34a",
  btnBg:      "#16a34a",
  btnHover:   "#15803d",
  btnColor:   "#ffffff",
}

const TEMA_BROTHERS: LoginTema = {
  panelBg:    "linear-gradient(145deg, #0a1628 0%, #0f1e3d 50%, #0a1628 100%)",
  glow1:      "rgba(29,78,216,0.20)",
  glow2:      "rgba(250,204,21,0.08)",
  iconBg:     "#facc15",
  iconColor:  "#1d4ed8",
  inputFocus: "#1d4ed8",
  btnBg:      "#facc15",
  btnHover:   "#eab308",
  btnColor:   "#1d4ed8",
}

export const TEMAS_LOGIN = { verde: TEMA_VERDE, brothers: TEMA_BROTHERS }

export function LoginForm({
  voltarHref,
  arenaLabel,
  tema = "verde",
}: {
  voltarHref?: string
  arenaLabel?: string
  tema?: keyof typeof TEMAS_LOGIN
} = {}) {
  const t = TEMAS_LOGIN[tema]
  const router = useRouter()
  const [email, setEmail]               = useState("")
  const [senha, setSenha]               = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro]                 = useState("")
  const [carregando, setCarregando]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    setCarregando(true)
    const resultado = await signIn("credentials", { email, password: senha, redirect: false })
    setCarregando(false)
    if (resultado?.error) { setErro("E-mail ou senha inválidos."); return }
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "#0a0a0a" }}>

      {/* ── Painel esquerdo ── */}
      <div
        className="lg:w-[45%] flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden"
        style={{ background: t.panelBg }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 50% at 30% 20%, ${t.glow1} 0%, transparent 60%)` }} />
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 50% 60% at 70% 80%, ${t.glow2} 0%, transparent 60%)` }} />
        </div>

        <div className="relative">
          {voltarHref && (
            <a href={voltarHref} className="inline-flex items-center gap-1.5 text-sm mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
              ← Voltar
            </a>
          )}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: t.iconBg }}>
              <Trophy className="w-6 h-6" style={{ color: t.iconColor }} />
            </div>
            <div>
              <span className="font-bold text-xl text-white block">Gestão de Quadra</span>
              {arenaLabel && <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{arenaLabel}</span>}
            </div>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <p className="text-3xl font-bold text-white leading-snug mb-3">
            Gerencie sua arena<br />com facilidade.
          </p>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem" }}>
            Agendamentos, fiado, clientes e muito mais em um só lugar.
          </p>
        </div>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: "#ffffff" }}>
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#0a0a0a" }}>Entrar na conta</h2>
          <p className="text-sm mb-8" style={{ color: "#6b7280" }}>Bem-vindo de volta</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium" style={{ color: "#374151" }}>E-mail</label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  display: "block", width: "100%", padding: "0.6rem 0.85rem",
                  borderRadius: "0.5rem", border: "1.5px solid #e5e7eb",
                  fontSize: "0.875rem", color: "#111827", background: "#fff",
                  outline: "none", transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = t.inputFocus)}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="senha" className="text-xs font-medium" style={{ color: "#374151" }}>Senha</label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  style={{
                    display: "block", width: "100%", padding: "0.6rem 2.5rem 0.6rem 0.85rem",
                    borderRadius: "0.5rem", border: "1.5px solid #e5e7eb",
                    fontSize: "0.875rem", color: "#111827", background: "#fff",
                    outline: "none", transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = t.inputFocus)}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#9ca3af" }}
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {erro && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca" }}>
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              style={{
                width: "100%", height: "2.75rem", borderRadius: "0.5rem",
                background: carregando ? t.btnHover : t.btnBg, color: t.btnColor,
                fontWeight: 600, fontSize: "0.875rem", border: "none",
                cursor: carregando ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => { if (!carregando) (e.currentTarget.style.background = t.btnHover) }}
              onMouseOut={(e) => { if (!carregando) (e.currentTarget.style.background = t.btnBg) }}
            >
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
