"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { ArrowLeft, Trophy, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { validarToken, redefinirSenha } from "./actions"

function RedefinirSenhaForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get("token") ?? ""

  const [tokenValido, setTokenValido]   = useState<boolean | null>(null)
  const [email, setEmail]               = useState("")
  const [senha, setSenha]               = useState("")
  const [confirmar, setConfirmar]       = useState("")
  const [mostrarSenha, setMostrar]      = useState(false)
  const [erro, setErro]                 = useState("")
  const [sucesso, setSucesso]           = useState(false)
  const [carregando, setLoad]           = useState(false)

  useEffect(() => {
    if (!token) { setTokenValido(false); return }
    validarToken(token).then((r) => {
      setTokenValido(r.valido)
      if (r.email) setEmail(r.email)
    })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    if (senha !== confirmar) { setErro("As senhas não coincidem."); return }
    if (senha.length < 6)    { setErro("A senha deve ter pelo menos 6 caracteres."); return }
    setLoad(true)
    const resultado = await redefinirSenha(token, senha)
    setLoad(false)
    if (!resultado.ok) { setErro(resultado.erro ?? "Erro ao redefinir."); return }
    setSucesso(true)
    setTimeout(() => signOut({ callbackUrl: "/login" }), 3000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: "#050a05" }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(34,197,94,0.18) 0%, transparent 70%)" }} />
      </div>

      <a
        href="/login"
        className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao login
      </a>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
            <Trophy className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Brejão Arena</h1>
          <p className="text-muted-foreground text-sm mt-1">Nova senha</p>
        </div>

        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-2xl shadow-black/60">
          {tokenValido === null && (
            <p className="text-sm text-muted-foreground text-center py-4">Verificando link...</p>
          )}

          {tokenValido === false && (
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-7 h-7 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Link inválido ou expirado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Este link não é mais válido. Solicite um novo link de redefinição.
                </p>
              </div>
              <a href="/esqueci-senha" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                Solicitar novo link
              </a>
            </div>
          )}

          {tokenValido === true && sucesso && (
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Senha redefinida!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sua senha foi alterada com sucesso. Redirecionando para o login...
                </p>
              </div>
            </div>
          )}

          {tokenValido === true && !sucesso && (
            <>
              <p className="text-sm font-semibold text-foreground mb-1">Crie uma nova senha</p>
              {email && (
                <p className="text-xs text-muted-foreground mb-5">
                  Para a conta <span className="text-foreground font-medium">{email}</span>
                </p>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="senha" className="text-xs text-muted-foreground">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground pr-10 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrar((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmar" className="text-xs text-muted-foreground">Confirmar nova senha</Label>
                  <Input
                    id="confirmar"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Repita a senha"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    required
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>

                {erro && (
                  <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20">
                    {erro}
                  </p>
                )}

                <Button type="submit" disabled={carregando || !senha || !confirmar} className="w-full h-11 font-semibold shadow-lg shadow-primary/20">
                  {carregando ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaForm />
    </Suspense>
  )
}
