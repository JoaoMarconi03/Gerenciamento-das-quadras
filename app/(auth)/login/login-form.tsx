"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Trophy, ArrowLeft } from "lucide-react"

export function LoginForm({
  tenantNome = "Gestão de Arena",
  tenantSlug,
  voltarHref = "/",
}: {
  tenantNome?: string
  tenantSlug?: string
  voltarHref?: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    setCarregando(true)

    const resultado = await signIn("credentials", {
      email,
      password: senha,
      redirect: false,
    })

    setCarregando(false)

    if (resultado?.error) {
      setErro("Email ou senha inválidos.")
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: "#050a05" }}>
      {/* Fundo com gradiente verde */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(34,197,94,0.18) 0%, transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(22,163,74,0.12) 0%, transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 40% 40% at 80% 50%, rgba(16,185,129,0.07) 0%, transparent 60%)" }} />
      </div>

      {/* Botão voltar */}
      <a
        href={voltarHref}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </a>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
            <Trophy className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{tenantNome}</h1>
          <p className="text-muted-foreground text-sm mt-1">Bem-vindo de volta</p>
        </div>

        {/* Card */}
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-2xl shadow-black/60">
          <p className="text-sm font-semibold text-foreground mb-5">Acesse sua conta</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha" className="text-xs text-muted-foreground">Senha</Label>
                <a href="/esqueci-senha" className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Esqueci minha senha
                </a>
              </div>
              <div className="relative">
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground pr-10 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {erro && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20">
                {erro}
              </p>
            )}

            <Button
              type="submit"
              disabled={carregando}
              className="w-full h-11 font-semibold shadow-lg shadow-primary/20"
            >
              {carregando ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Não tem conta?{" "}
          <a
            href={tenantSlug ? `/registro?arena=${tenantSlug}` : "/registro"}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Criar conta
          </a>
        </p>
      </div>
    </div>
  )
}
