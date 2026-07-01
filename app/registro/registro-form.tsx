"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Trophy, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { registrarCliente } from "./actions"

export function RegistroForm({
  tenantSlug,
  tenantNome,
}: {
  tenantSlug: string
  tenantNome: string
}) {
  const router = useRouter()
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const senha    = formData.get("senha") as string
    const confirmar = formData.get("confirmar") as string

    if (senha !== confirmar) {
      setError("As senhas não coincidem.")
      setLoading(false)
      return
    }

    const result = await registrarCliente(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    const loginResult = await signIn("credentials", {
      email:    formData.get("email") as string,
      password: senha,
      redirect: false,
    })

    if (loginResult?.ok) {
      router.push("/minha-conta")
    } else {
      router.push("/login")
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, oklch(0.627 0.194 142.5 / 0.15) 0%, oklch(0.09 0 0) 65%)",
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">{tenantNome}</span>
          </Link>
          <p className="text-muted-foreground mt-2 text-sm">Crie sua conta e agende sua quadra</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <h1 className="text-xl font-semibold mb-6">Criar conta</h1>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="arena" value={tenantSlug} />

            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo *</Label>
              <Input id="nome" name="nome" placeholder="Seu nome" required disabled={loading} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" name="email" type="email" placeholder="seu@email.com" required disabled={loading} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" type="tel" placeholder="(00) 00000-0000" disabled={loading} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha *</Label>
              <div className="relative">
                <Input
                  id="senha"
                  name="senha"
                  type={showSenha ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmar">Confirmar senha *</Label>
              <Input id="confirmar" name="confirmar" type="password" placeholder="Repita a senha" required disabled={loading} />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar conta"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Já tem conta?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link href="/" className="hover:text-primary transition-colors">
            ← Voltar para a página inicial
          </Link>
        </p>
      </div>
    </div>
  )
}
