"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ChevronRight, Check } from "lucide-react"
import { LogoMark } from "@/components/logo-mark"
import { ajustarPersistenciaSessao } from "./actions"

const TEMA = {
  panelBg:    "linear-gradient(145deg, #0a0a0a 0%, #0a1628 50%, #0f1e3d 100%)",
  glow1:      "rgba(29,78,216,0.20)",
  glow2:      "rgba(29,78,216,0.10)",
  iconBg:     "#1d4ed8",
  iconColor:  "#ffffff",
  inputFocus: "#1d4ed8",
  btnBg:      "#1d4ed8",
  btnHover:   "#1e40af",
  btnColor:   "#ffffff",
}

export function LoginForm({ voltarHref }: { voltarHref?: string } = {}) {
  const t = TEMA
  const router = useRouter()
  const [etapa, setEtapa]               = useState<"credenciais" | "confirmar">("credenciais")
  const [tenantNome, setTenantNome]     = useState("")
  const [email, setEmail]               = useState("")
  const [senha, setSenha]               = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [manterConectado, setManterConectado] = useState(true)
  const [erro, setErro]                 = useState("")
  const [carregando, setCarregando]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    setCarregando(true)
    const resultado = await signIn("credentials", { email, password: senha, redirect: false })
    if (resultado?.error) {
      setCarregando(false)
      setErro("E-mail ou senha inválidos.")
      return
    }
    await ajustarPersistenciaSessao(manterConectado)
    const session = await getSession()
    setCarregando(false)
    setTenantNome(session?.user?.tenantNome ?? "sua arena")
    setEtapa("confirmar")
  }

  function entrarNoSistema() {
    router.push("/dashboard")
  }

  if (etapa === "confirmar") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#ffffff" }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-6" style={{ background: t.iconBg }}>
            <LogoMark className="w-6 h-6" style={{ color: t.iconColor }} />
          </div>
          <p className="text-sm mb-1" style={{ color: "#6b7280" }}>Selecione a arena para continuar</p>
          <h2 className="text-xl font-bold mb-8" style={{ color: "#0a0a0a" }}>{tenantNome}</h2>

          <button
            type="button"
            onClick={entrarNoSistema}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl mb-4"
            style={{ border: "1.5px solid #e5e7eb", background: "#fff", textAlign: "left" }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = t.inputFocus)}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
          >
            <span className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#eff2ff" }}>
                <LogoMark className="w-4 h-4" style={{ color: t.iconBg }} />
              </span>
              <span className="font-semibold text-sm" style={{ color: "#111827" }}>{tenantNome}</span>
            </span>
            <ChevronRight className="w-4 h-4" style={{ color: "#9ca3af" }} />
          </button>

          <button
            type="button"
            onClick={entrarNoSistema}
            style={{
              width: "100%", height: "2.75rem", borderRadius: "0.5rem",
              background: t.btnBg, color: t.btnColor,
              fontWeight: 600, fontSize: "0.875rem", border: "none", cursor: "pointer",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = t.btnHover)}
            onMouseOut={(e) => (e.currentTarget.style.background = t.btnBg)}
          >
            Entrar
          </button>
        </div>
      </div>
    )
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
              <LogoMark className="w-6 h-6" style={{ color: t.iconColor }} />
            </div>
            <div>
              <span className="font-bold text-xl text-white block">MaPlayce</span>
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

            <label className="flex items-center gap-2 cursor-pointer select-none" style={{ marginTop: "-0.25rem" }}>
              <span
                onClick={() => setManterConectado((v) => !v)}
                className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                style={{
                  border: `1.5px solid ${manterConectado ? t.inputFocus : "#d1d5db"}`,
                  background: manterConectado ? t.inputFocus : "#fff",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                {manterConectado && <Check className="w-3 h-3" style={{ color: "#fff" }} strokeWidth={3} />}
              </span>
              <span
                onClick={() => setManterConectado((v) => !v)}
                className="text-xs"
                style={{ color: "#374151" }}
              >
                Manter conectado
              </span>
            </label>

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
