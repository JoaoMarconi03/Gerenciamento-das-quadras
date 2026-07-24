"use server"

import { cookies } from "next/headers"

// Se o usuario NAO quiser manter conectado, reescreve o cookie de sessao
// (que o NextAuth acabou de criar como persistente) sem data de expiracao —
// vira um cookie de sessao normal, que some quando o navegador fecha.
export async function ajustarPersistenciaSessao(manterConectado: boolean) {
  if (manterConectado) return

  const cookieStore = await cookies()
  const cookiesDeSessao = cookieStore.getAll().filter((c) => c.name.includes("session-token"))

  for (const cookie of cookiesDeSessao) {
    cookieStore.set({
      name: cookie.name,
      value: cookie.value,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: cookie.name.startsWith("__Secure-"),
    })
  }
}
