"use server"

import { db } from "@/lib/db"
import { Resend } from "resend"

export async function solicitarRedefinicao(
  email: string,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { ok: false, erro: "Serviço de e-mail não configurado. Entre em contato com o administrador." }
    }
    const resend = new Resend(process.env.RESEND_API_KEY)

    const usuario = await db.usuario.findUnique({ where: { email } })

    // Não revelamos se o e-mail existe ou não (segurança)
    if (!usuario) return { ok: true }

    // Invalida tokens anteriores do mesmo e-mail
    await db.$executeRaw`
      UPDATE "TokenRedefinicaoSenha" SET "usado" = true
      WHERE email = ${email} AND "usado" = false
    `

    // Cria novo token válido por 1 hora
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000)
    const registro = await db.tokenRedefinicaoSenha.create({
      data: { email, expiraEm },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    const link = `${baseUrl}/redefinir-senha?token=${registro.token}`

    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "Brejão Arena <onboarding@resend.dev>",
      to: email,
      subject: "Redefinição de senha — Brejão Arena",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#16a34a;margin-bottom:8px">Brejão Arena</h2>
          <p style="color:#374151">Olá, <strong>${usuario.nome}</strong>!</p>
          <p style="color:#374151">Recebemos uma solicitação para redefinir a sua senha. Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.</p>
          <a href="${link}"
             style="display:inline-block;margin:20px 0;padding:12px 28px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
            Redefinir minha senha
          </a>
          <p style="color:#6b7280;font-size:13px">Se você não solicitou isso, pode ignorar este e-mail. Sua senha não será alterada.</p>
          <p style="color:#6b7280;font-size:12px;margin-top:24px">Se o botão não funcionar, copie e cole este link:<br/>
            <a href="${link}" style="color:#16a34a">${link}</a>
          </p>
        </div>
      `,
    })

    return { ok: true }
  } catch (e) {
    console.error("[solicitarRedefinicao]", e)
    return { ok: false, erro: "Erro ao enviar o e-mail. Tente novamente." }
  }
}
